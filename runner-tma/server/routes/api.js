// =====================================================================
// API del juego. Todas las rutas (salvo /config y el callback de Adsgram)
// requieren initData de Telegram válido.
// =====================================================================
import crypto from 'node:crypto';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { authMiddleware } from '../auth.js';
import { evaluateRun } from '../antiCheat.js';
import { GAME } from '../../shared/gameConfig.js';
import {
  SKINS, UPGRADES, CONSUMABLES, DEFAULT_SKIN,
  findSkin, findUpgrade, findConsumable,
} from '../../shared/catalog.js';
import { createAdsService } from '../ads.js';
import { ApiError } from '../errors.js';

export function createApiRouter({ config, db }) {
  const router = express.Router();
  const ads = createAdsService({ config, db });

  // ---------------- Consultas preparadas ----------------
  const q = {
    inventory: db.prepare('SELECT item_id, qty FROM inventory WHERE user_id = ?'),
    invGet: db.prepare('SELECT qty FROM inventory WHERE user_id = ? AND item_id = ?'),
    invSet: db.prepare(`INSERT INTO inventory (user_id, item_id, qty) VALUES (?, ?, ?)
                        ON CONFLICT(user_id, item_id) DO UPDATE SET qty = excluded.qty`),
    userGet: db.prepare('SELECT * FROM users WHERE id = ?'),
    addCoins: db.prepare('UPDATE users SET coins = coins + ? WHERE id = ?'),
    ledger: db.prepare('INSERT INTO coin_ledger (user_id, delta, reason, ref, created_at) VALUES (?, ?, ?, ?, ?)'),
    abandonRuns: db.prepare("UPDATE runs SET status = 'abandoned' WHERE user_id = ? AND status = 'active'"),
    insertRun: db.prepare(`INSERT INTO runs (id, user_id, seed, multiplier, items_used, started_at)
                           VALUES (?, ?, ?, ?, ?, ?)`),
    lastRunStart: db.prepare('SELECT started_at FROM runs WHERE user_id = ? ORDER BY started_at DESC LIMIT 1'),
    runGet: db.prepare('SELECT * FROM runs WHERE id = ? AND user_id = ?'),
    finishRun: db.prepare(`UPDATE runs SET status = 'finished', finished_at = @now,
                             reported_distance = @rd, reported_coins = @rc, distance = @distance,
                             coins_collected = @coins, coins_awarded = @awarded, score = @score,
                             flagged = @flagged, flag_reason = @reason
                           WHERE id = @id AND status = 'active'`),
    userAfterRun: db.prepare(`UPDATE users SET best_score = MAX(best_score, @score),
                                total_runs = total_runs + 1,
                                suspicious_count = suspicious_count + @flagged
                              WHERE id = @id`),
    setPendingMult: db.prepare('UPDATE users SET pending_multiplier = ? WHERE id = ?'),
    equip: db.prepare('UPDATE users SET equipped_skin = ? WHERE id = ?'),
    top: db.prepare(`SELECT id, first_name, username, best_score, equipped_skin FROM users
                     WHERE best_score > 0 AND banned = 0 ORDER BY best_score DESC, id ASC LIMIT 50`),
    rank: db.prepare('SELECT COUNT(*) + 1 AS rank FROM users WHERE best_score > ? AND banned = 0'),
  };

  function changeCoins(userId, delta, reason, ref) {
    q.addCoins.run(delta, userId);
    q.ledger.run(userId, delta, reason, ref || null, Date.now());
  }

  function inventoryMap(userId) {
    const map = {};
    for (const row of q.inventory.all(userId)) map[row.item_id] = row.qty;
    return map;
  }

  // Perfil completo que consume el cliente.
  function profile(userId) {
    const u = q.userGet.get(userId);
    const inv = inventoryMap(userId);
    return {
      id: u.id,
      name: u.first_name || u.username || 'Jugador',
      coins: u.coins,
      bestScore: u.best_score,
      totalRuns: u.total_runs,
      equippedSkin: u.equipped_skin,
      pendingMultiplier: !!u.pending_multiplier,
      skins: [DEFAULT_SKIN, ...SKINS.filter((s) => s.id !== DEFAULT_SKIN && inv[`skin:${s.id}`] > 0).map((s) => s.id)],
      upgrades: Object.fromEntries(UPGRADES.map((up) => [up.id, inv[`upgrade:${up.id}`] || 0])),
      consumables: Object.fromEntries(CONSUMABLES.map((c) => [c.id, inv[`consumable:${c.id}`] || 0])),
    };
  }

  // Envuelve un handler: transacción SQLite + manejo uniforme de errores.
  const handle = (fn, { tx = true } = {}) => async (req, res) => {
    try {
      const result = tx ? db.transaction(() => fn(req, res))() : await fn(req, res);
      if (!res.headersSent) res.json(result);
    } catch (err) {
      if (err instanceof ApiError) return res.status(err.status).json({ error: err.code, ...err.extra });
      console.error('[api]', err);
      res.status(500).json({ error: 'internal' });
    }
  };

  // ---------------- Rutas públicas ----------------

  // Configuración pública para el cliente (sin datos sensibles).
  router.get('/config', (req, res) => {
    res.json({
      devAuth: config.devAuth,
      ads: {
        provider: config.ads.provider,
        blockId: config.ads.provider === 'adsgram' ? config.ads.adsgramBlockId : null,
        debug: config.ads.adsgramDebug,
      },
      game: { maxRevives: GAME.MAX_REVIVES, reviveWindowSec: GAME.REVIVE_WINDOW_SEC },
      catalog: { skins: SKINS, upgrades: UPGRADES, consumables: CONSUMABLES },
    });
  });

  // Callback server-to-server de Adsgram ("Reward URL" en su panel):
  //   https://TU-DOMINIO/api/ads/adsgram/reward?userid=[userId]&secret=TU_SECRETO
  router.get('/ads/adsgram/reward', (req, res) => {
    // 200 si el secreto es correcto (aunque no haya anuncio pendiente, para evitar reintentos);
    // 403 si el secreto no coincide (alguien intentando falsificar recompensas).
    const ok = ads.handleAdsgramCallback(req.query);
    res.status(ok ? 200 : 403).send(ok ? 'ok' : 'forbidden');
  });

  // ---------------- Rutas autenticadas ----------------
  router.use(authMiddleware({ config, db }));

  // Límite general por usuario (además del límite por IP de index.js).
  router.use(rateLimit({
    windowMs: 60_000,
    limit: 90,
    keyGenerator: (req) => String(req.user.id),
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  }));

  router.get('/me', handle((req) => profile(req.user.id), { tx: false }));

  // ---- Partidas ----
  router.post('/runs/start', handle((req) => {
    const userId = req.user.id;
    const last = q.lastRunStart.get(userId);
    if (last && Date.now() - last.started_at < 1500) throw new ApiError(429, 'too_fast');

    // Consumibles que el jugador quiere activar en esta partida.
    const wanted = Array.isArray(req.body?.items) ? [...new Set(req.body.items)].slice(0, 5) : [];
    const used = [];
    for (const itemId of wanted) {
      const item = findConsumable(itemId);
      if (!item) throw new ApiError(400, 'unknown_item', { itemId });
      const invKey = `consumable:${item.id}`;
      const qty = q.invGet.get(userId, invKey)?.qty || 0;
      if (qty < 1) throw new ApiError(400, 'not_enough_items', { itemId });
      q.invSet.run(userId, invKey, qty - 1);
      used.push(item.id);
    }

    q.abandonRuns.run(userId); // sólo una partida activa por usuario
    const u = q.userGet.get(userId);
    const multiplier = u.pending_multiplier ? 2 : 1;
    if (u.pending_multiplier) q.setPendingMult.run(0, userId);

    const runId = crypto.randomUUID();
    const seed = crypto.randomInt(1, 2 ** 31 - 1);
    q.insertRun.run(runId, userId, seed, multiplier, JSON.stringify(used), Date.now());

    const p = profile(userId);
    return {
      runId,
      seed,
      multiplier,
      items: used,
      upgrades: p.upgrades,
      skin: p.equippedSkin,
      maxRevives: GAME.MAX_REVIVES,
    };
  }));

  router.post('/runs/:id/finish', handle((req) => {
    const userId = req.user.id;
    const run = q.runGet.get(req.params.id, userId);
    if (!run) throw new ApiError(404, 'run_not_found');
    if (run.status !== 'active') throw new ApiError(409, 'run_not_active');

    const now = Date.now();
    const result = evaluateRun({
      seed: run.seed,
      startedAt: run.started_at,
      now,
      reportedDistance: req.body?.distance,
      reportedCoins: req.body?.coins,
    });
    const awarded = result.coins * run.multiplier;
    const prevBest = q.userGet.get(userId).best_score;

    const upd = q.finishRun.run({
      id: run.id, now,
      rd: Number(req.body?.distance) || 0,
      rc: Number.isInteger(req.body?.coins) ? req.body.coins : 0,
      distance: result.distance, coins: result.coins, awarded,
      score: result.score, flagged: result.flagged ? 1 : 0,
      reason: result.reasons.join(',') || null,
    });
    if (upd.changes !== 1) throw new ApiError(409, 'run_not_active'); // doble envío concurrente

    if (awarded > 0) changeCoins(userId, awarded, 'run', run.id);
    q.userAfterRun.run({ id: userId, score: result.score, flagged: result.flagged ? 1 : 0 });
    if (result.flagged) console.warn(`[anticheat] user=${userId} run=${run.id} ${result.reasons.join(',')}`);

    const u = q.userGet.get(userId);
    return {
      score: result.score,
      coinsCollected: result.coins,
      multiplier: run.multiplier,
      coinsAwarded: awarded,
      coinsBalance: u.coins,
      bestScore: u.best_score,
      newBest: result.score > prevBest,
      flagged: result.flagged,
    };
  }));

  // ---- Anuncios recompensados ----
  // 1) El cliente pide permiso para mostrar un anuncio (se registra "pending").
  router.post('/ads/request', handle((req) => {
    return ads.requestAd(req.user.id, req.body?.type, req.body?.runId);
  }));

  // 2) Después de verlo, reclama la recompensa. Si hay verificación S2S,
  //    se espera (hasta ~6 s) a que llegue el callback de Adsgram.
  router.post('/ads/claim', handle(async (req) => {
    const reward = await ads.claimAd(req.user.id, req.body?.adId);
    return { ...reward, profile: profile(req.user.id) };
  }, { tx: false }));

  // ---- Tienda ----
  router.post('/shop/buy', handle((req) => {
    const userId = req.user.id;
    const itemId = String(req.body?.itemId || '');
    const [kind, id] = itemId.split(':');
    const u = q.userGet.get(userId);

    let price;
    let invKey;
    let newQty;
    if (kind === 'skin') {
      const skin = findSkin(id);
      if (!skin || skin.price <= 0) throw new ApiError(400, 'unknown_item');
      invKey = `skin:${skin.id}`;
      if ((q.invGet.get(userId, invKey)?.qty || 0) > 0) throw new ApiError(409, 'already_owned');
      price = skin.price;
      newQty = 1;
    } else if (kind === 'upgrade') {
      const up = findUpgrade(id);
      if (!up) throw new ApiError(400, 'unknown_item');
      invKey = `upgrade:${up.id}`;
      const level = q.invGet.get(userId, invKey)?.qty || 0;
      if (level >= up.prices.length) throw new ApiError(409, 'max_level');
      price = up.prices[level];
      newQty = level + 1;
    } else if (kind === 'consumable') {
      const c = findConsumable(id);
      if (!c) throw new ApiError(400, 'unknown_item');
      invKey = `consumable:${c.id}`;
      const qty = q.invGet.get(userId, invKey)?.qty || 0;
      if (qty >= c.maxStack) throw new ApiError(409, 'max_stack');
      price = c.price;
      newQty = qty + 1;
    } else {
      throw new ApiError(400, 'unknown_item');
    }

    if (u.coins < price) throw new ApiError(402, 'not_enough_coins');
    changeCoins(userId, -price, 'shop', itemId);
    q.invSet.run(userId, invKey, newQty);
    return { ok: true, profile: profile(userId) };
  }));

  router.post('/shop/equip', handle((req) => {
    const userId = req.user.id;
    const skinId = String(req.body?.skinId || '');
    const skin = findSkin(skinId);
    if (!skin) throw new ApiError(400, 'unknown_item');
    const owned = skin.id === DEFAULT_SKIN || (q.invGet.get(userId, `skin:${skin.id}`)?.qty || 0) > 0;
    if (!owned) throw new ApiError(403, 'not_owned');
    q.equip.run(skin.id, userId);
    return { ok: true, profile: profile(userId) };
  }));

  // ---- Ranking ----
  router.get('/leaderboard', handle((req) => {
    const me = q.userGet.get(req.user.id);
    return {
      top: q.top.all().map((r, i) => ({
        rank: i + 1,
        name: r.first_name || r.username || 'Jugador',
        score: r.best_score,
        skin: r.equipped_skin,
        isMe: r.id === me.id,
      })),
      me: { rank: me.best_score > 0 ? q.rank.get(me.best_score).rank : null, score: me.best_score },
    };
  }, { tx: false }));

  return router;
}
