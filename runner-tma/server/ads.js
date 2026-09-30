// =====================================================================
// Servicio de anuncios recompensados (Rewarded Ads).
//
// Flujo seguro:
//   1. POST /ads/request  -> el servidor registra un ad_view "pending".
//   2. El cliente muestra el anuncio (Adsgram SDK).
//   3. Adsgram llama a nuestra Reward URL (server-to-server) -> "verified".
//   4. POST /ads/claim    -> sólo si está "verified" se entrega el premio.
//
// Si no configurás ADSGRAM_REWARD_SECRET se omite el paso 3 y se confía en
// el cliente (con límites de frecuencia y tope diario). Funciona, pero un
// usuario técnico podría reclamar premios sin ver anuncios.
// =====================================================================
import crypto from 'node:crypto';
import { GAME } from '../shared/gameConfig.js';
import { ApiError } from './errors.js';

const AD_TTL_MS = 15 * 60 * 1000;     // un anuncio pedido vence a los 15 min
const REQUEST_COOLDOWN_MS = 2500;     // mínimo entre pedidos de anuncio
const VERIFY_WAIT_MS = 6000;          // espera máxima del callback de Adsgram
const VERIFY_POLL_MS = 300;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function createAdsService({ config, db }) {
  const s2sVerification = config.ads.provider === 'adsgram' && !!config.ads.rewardSecret;

  const q = {
    lastRequest: db.prepare('SELECT created_at FROM ad_views WHERE user_id = ? ORDER BY created_at DESC LIMIT 1'),
    rewardedToday: db.prepare("SELECT COUNT(*) AS n FROM ad_views WHERE user_id = ? AND status = 'rewarded' AND rewarded_at > ?"),
    expireOpen: db.prepare("UPDATE ad_views SET status = 'expired' WHERE user_id = ? AND status IN ('pending','verified')"),
    insert: db.prepare(`INSERT INTO ad_views (id, user_id, run_id, type, provider, status, created_at)
                        VALUES (?, ?, ?, ?, ?, 'pending', ?)`),
    get: db.prepare('SELECT * FROM ad_views WHERE id = ? AND user_id = ?'),
    latestPending: db.prepare(`SELECT id FROM ad_views WHERE user_id = ? AND status = 'pending' AND created_at > ?
                               ORDER BY created_at DESC LIMIT 1`),
    markVerified: db.prepare("UPDATE ad_views SET status = 'verified', verified_at = ? WHERE id = ? AND status = 'pending'"),
    markRewarded: db.prepare("UPDATE ad_views SET status = 'rewarded', rewarded_at = ? WHERE id = ? AND status IN ('pending','verified')"),
    markExpired: db.prepare("UPDATE ad_views SET status = 'expired' WHERE id = ?"),
    user: db.prepare('SELECT pending_multiplier FROM users WHERE id = ?'),
    setMult: db.prepare('UPDATE users SET pending_multiplier = 1 WHERE id = ?'),
    run: db.prepare('SELECT * FROM runs WHERE id = ? AND user_id = ?'),
    addRevive: db.prepare(`UPDATE runs SET revives = revives + 1
                           WHERE id = ? AND status = 'active' AND revives < ?`),
  };

  // --- 1. Pedido de anuncio ---
  const requestAd = db.transaction((userId, type, runId) => {
    if (!['multiplier', 'revive'].includes(type)) throw new ApiError(400, 'invalid_type');
    const now = Date.now();

    const last = q.lastRequest.get(userId);
    if (last && now - last.created_at < REQUEST_COOLDOWN_MS) throw new ApiError(429, 'ad_cooldown');

    const { n } = q.rewardedToday.get(userId, now - 24 * 3600 * 1000);
    if (n >= config.ads.dailyCap) throw new ApiError(429, 'daily_cap');

    if (type === 'multiplier') {
      if (q.user.get(userId).pending_multiplier) throw new ApiError(409, 'multiplier_already_active');
      runId = null;
    } else {
      const run = q.run.get(String(runId || ''), userId);
      if (!run || run.status !== 'active') throw new ApiError(409, 'run_not_active');
      if (run.revives >= GAME.MAX_REVIVES) throw new ApiError(409, 'max_revives');
    }

    // Sólo un anuncio "en vuelo" por usuario: así el callback S2S (que sólo
    // trae el userId) sabe exactamente qué anuncio confirmar.
    q.expireOpen.run(userId);
    const adId = crypto.randomUUID();
    q.insert.run(adId, userId, runId, type, config.ads.provider, now);
    return {
      adId,
      provider: config.ads.provider,
      blockId: config.ads.provider === 'adsgram' ? config.ads.adsgramBlockId : null,
    };
  });

  // --- 3. Callback S2S de Adsgram ---
  function handleAdsgramCallback(query) {
    if (!config.ads.rewardSecret) return false;
    const given = Buffer.from(String(query.secret || ''));
    const expected = Buffer.from(config.ads.rewardSecret);
    if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
      console.warn('[ads] callback con secreto inválido');
      return false;
    }
    const userId = parseInt(query.userid ?? query.userId, 10);
    if (!Number.isSafeInteger(userId)) return true;
    const ad = q.latestPending.get(userId, Date.now() - AD_TTL_MS);
    if (ad) q.markVerified.run(Date.now(), ad.id);
    else console.warn(`[ads] callback sin anuncio pendiente para user=${userId}`);
    return true;
  }

  // --- 4. Reclamo de recompensa ---
  const applyReward = db.transaction((userId, adId) => {
    const ad = q.get.get(adId, userId);
    if (!ad || ad.status === 'rewarded') throw new ApiError(409, 'already_claimed');
    if (ad.status === 'expired') throw new ApiError(410, 'ad_expired');
    if (s2sVerification && ad.status !== 'verified') throw new ApiError(409, 'not_verified');

    if (ad.type === 'multiplier') {
      q.setMult.run(userId);
    } else {
      const upd = q.addRevive.run(ad.run_id, GAME.MAX_REVIVES);
      if (upd.changes !== 1) {
        q.markExpired.run(ad.id);
        throw new ApiError(409, 'revive_not_allowed');
      }
    }
    q.markRewarded.run(Date.now(), ad.id);
    const run = ad.run_id ? q.run.get(ad.run_id, userId) : null;
    return { ok: true, type: ad.type, runId: ad.run_id, revivesUsed: run ? run.revives : undefined };
  });

  async function claimAd(userId, adId) {
    adId = String(adId || '');
    const ad = q.get.get(adId, userId);
    if (!ad) throw new ApiError(404, 'ad_not_found');
    if (ad.status === 'rewarded') throw new ApiError(409, 'already_claimed');
    if (ad.status === 'expired' || Date.now() - ad.created_at > AD_TTL_MS) throw new ApiError(410, 'ad_expired');
    if (Date.now() - ad.created_at < config.ads.minWatchSeconds * 1000) throw new ApiError(400, 'too_soon');

    // Esperamos el callback de Adsgram (puede llegar unos segundos tarde).
    if (s2sVerification && ad.status !== 'verified') {
      const deadline = Date.now() + VERIFY_WAIT_MS;
      while (Date.now() < deadline) {
        await sleep(VERIFY_POLL_MS);
        if (q.get.get(adId, userId).status === 'verified') break;
      }
    }
    return applyReward(userId, adId);
  }

  return { requestAd, claimAd, handleAdsgramCallback };
}
