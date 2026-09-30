// Utilidades de test: levanta la app en un puerto aleatorio con DB en memoria.
import { loadConfig } from '../server/config.js';
import { openDatabase } from '../server/db.js';
import { createApp } from '../server/app.js';
import { signInitData } from '../server/auth.js';

export const BOT_TOKEN = '123456:TEST_TOKEN_abcdefghijklmnopqrstuvwxyz';

export async function startTestServer(envOverrides = {}) {
  const config = loadConfig({
    NODE_ENV: 'test',
    BOT_TOKEN,
    DB_PATH: ':memory:',
    ADS_PROVIDER: 'mock',
    ADS_MIN_WATCH_SECONDS: '0',
    ...envOverrides,
  });
  const db = openDatabase(':memory:');
  const app = createApp({ config, db });
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  return {
    config, db, base,
    close: () => new Promise((r) => server.close(r)),
  };
}

export function initDataFor(userId, extra = {}) {
  return signInitData({
    auth_date: String(Math.floor(Date.now() / 1000)),
    query_id: 'AAHdF6IQAAAAAN0XohDhrOrc',
    user: JSON.stringify({ id: userId, first_name: `User${userId}`, username: `u${userId}` }),
    ...extra,
  }, BOT_TOKEN);
}

export function client(base, initData) {
  return async function call(method, path, body) {
    const res = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `tma ${initData}` },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    return { status: res.status, data };
  };
}
