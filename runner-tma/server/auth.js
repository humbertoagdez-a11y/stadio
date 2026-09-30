// =====================================================================
// Autenticación con Telegram Web Apps.
//
// Telegram firma `initData` con el token de TU bot. Verificamos la firma
// en el servidor => nadie puede hacerse pasar por otro Telegram ID.
// Doc oficial: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
// =====================================================================
import crypto from 'node:crypto';

/**
 * Valida el string initData. Devuelve { user, authDate } o lanza Error.
 * Algoritmo:
 *   secret = HMAC_SHA256(key="WebAppData", msg=bot_token)
 *   hash   = hex(HMAC_SHA256(key=secret, msg=data_check_string))
 *   data_check_string = pares "k=v" (todos menos hash) ordenados y unidos por "\n"
 */
export function validateInitData(initData, botToken, maxAgeSec = 86400, nowSec = Math.floor(Date.now() / 1000)) {
  if (!initData || typeof initData !== 'string') throw new Error('initData vacío');
  if (!botToken) throw new Error('BOT_TOKEN no configurado');

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash || !/^[a-f0-9]{64}$/i.test(hash)) throw new Error('hash inválido');

  const pairs = [];
  for (const [key, value] of params.entries()) {
    if (key === 'hash') continue;
    pairs.push(`${key}=${value}`);
  }
  pairs.sort();
  const dataCheckString = pairs.join('\n');

  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computed = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');

  const a = Buffer.from(computed, 'hex');
  const b = Buffer.from(hash, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new Error('firma inválida');

  const authDate = parseInt(params.get('auth_date') || '0', 10);
  if (!authDate || nowSec - authDate > maxAgeSec) throw new Error('initData expirado');

  let user;
  try {
    user = JSON.parse(params.get('user') || 'null');
  } catch {
    throw new Error('user inválido');
  }
  if (!user || !Number.isSafeInteger(user.id)) throw new Error('user ausente');
  return { user, authDate };
}

/** Utilidad para tests/desarrollo: firma un initData como lo haría Telegram. */
export function signInitData(fields, botToken) {
  const params = new URLSearchParams(fields);
  const pairs = [...params.entries()].map(([k, v]) => `${k}=${v}`).sort();
  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const hash = crypto.createHmac('sha256', secret).update(pairs.join('\n')).digest('hex');
  params.set('hash', hash);
  return params.toString();
}

/**
 * Middleware Express. Espera el header:  Authorization: tma <initData>
 * En modo DEV_AUTH (sólo fuera de producción) acepta:  Authorization: tma dev:<id>
 */
export function authMiddleware({ config, db }) {
  const upsert = db.prepare(`
    INSERT INTO users (id, username, first_name, last_name, language_code, is_premium, created_at, last_seen_at)
    VALUES (@id, @username, @first_name, @last_name, @language_code, @is_premium, @now, @now)
    ON CONFLICT(id) DO UPDATE SET
      username = excluded.username,
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      language_code = excluded.language_code,
      is_premium = excluded.is_premium,
      last_seen_at = excluded.last_seen_at
  `);
  const getUser = db.prepare('SELECT * FROM users WHERE id = ?');

  return function auth(req, res, next) {
    const header = req.get('authorization') || '';
    if (!header.startsWith('tma ')) return res.status(401).json({ error: 'unauthorized' });
    const raw = header.slice(4);

    let tgUser;
    if (config.devAuth && raw.startsWith('dev:')) {
      const id = parseInt(raw.slice(4), 10);
      if (!Number.isSafeInteger(id) || id <= 0) return res.status(401).json({ error: 'dev id inválido' });
      tgUser = { id, first_name: `Dev ${id}`, username: `dev${id}` };
    } else {
      try {
        tgUser = validateInitData(raw, config.botToken, config.initDataMaxAge).user;
      } catch (err) {
        return res.status(401).json({ error: 'unauthorized', detail: err.message });
      }
    }

    upsert.run({
      id: tgUser.id,
      username: tgUser.username || null,
      first_name: (tgUser.first_name || '').slice(0, 64),
      last_name: (tgUser.last_name || '').slice(0, 64) || null,
      language_code: tgUser.language_code || null,
      is_premium: tgUser.is_premium ? 1 : 0,
      now: Date.now(),
    });
    const user = getUser.get(tgUser.id);
    if (user.banned) return res.status(403).json({ error: 'banned' });
    req.user = user;
    next();
  };
}
