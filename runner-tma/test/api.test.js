import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, initDataFor, client } from './helpers.js';
import { speedAt } from '../shared/gameConfig.js';

let srv;
before(async () => { srv = await startTestServer(); });
after(async () => { await srv.close(); });

test('sin initData => 401', async () => {
  const res = await fetch(`${srv.base}/api/me`);
  assert.equal(res.status, 401);
});

test('initData falsificado => 401', async () => {
  const call = client(srv.base, initDataFor(1).replace(/hash=[a-f0-9]+/, `hash=${'0'.repeat(64)}`));
  assert.equal((await call('GET', '/api/me')).status, 401);
});

test('dev auth deshabilitado por defecto', async () => {
  const call = client(srv.base, 'dev:5');
  assert.equal((await call('GET', '/api/me')).status, 401);
});

test('flujo completo: partida, multiplicador, revive, tienda', async () => {
  const call = client(srv.base, initDataFor(1001));
  const me = await call('GET', '/api/me');
  assert.equal(me.status, 200);
  assert.equal(me.data.coins, 0);

  // --- Multiplier ad antes de jugar ---
  const ad = await call('POST', '/api/ads/request', { type: 'multiplier' });
  assert.equal(ad.status, 200);
  const claim = await call('POST', '/api/ads/claim', { adId: ad.data.adId });
  assert.equal(claim.status, 200);
  assert.equal(claim.data.profile.pendingMultiplier, true);
  // No se puede reclamar dos veces
  assert.equal((await call('POST', '/api/ads/claim', { adId: ad.data.adId })).status, 409);

  // --- Partida ---
  const run = await call('POST', '/api/runs/start', { items: [] });
  assert.equal(run.status, 200);
  assert.equal(run.data.multiplier, 2);

  // --- Revive: máximo 3 ---
  for (let i = 0; i < 3; i++) {
    await srv.db.prepare('UPDATE ad_views SET created_at = created_at - 10000 WHERE user_id = 1001').run();
    const r = await call('POST', '/api/ads/request', { type: 'revive', runId: run.data.runId });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    const c = await call('POST', '/api/ads/claim', { adId: r.data.adId });
    assert.equal(c.status, 200);
    assert.equal(c.data.revivesUsed, i + 1);
  }
  await srv.db.prepare('UPDATE ad_views SET created_at = created_at - 10000 WHERE user_id = 1001').run();
  const fourth = await call('POST', '/api/ads/request', { type: 'revive', runId: run.data.runId });
  assert.equal(fourth.status, 409);
  assert.equal(fourth.data.error, 'max_revives');

  // Simulamos que la partida duró 40 s (movemos started_at hacia atrás)
  await srv.db.prepare('UPDATE runs SET started_at = started_at - 40000 WHERE id = ?').run(run.data.runId);
  let d = 0;
  for (let t = 0; t < 38; t += 1 / 60) d += speedAt(d) / 60;
  const fin = await call('POST', `/api/runs/${run.data.runId}/finish`, { distance: d, coins: 50 });
  assert.equal(fin.status, 200, JSON.stringify(fin.data));
  assert.equal(fin.data.flagged, false);
  assert.equal(fin.data.coinsAwarded, 100); // x2
  assert.equal(fin.data.coinsBalance, 100);

  // No se puede terminar dos veces la misma partida
  assert.equal((await call('POST', `/api/runs/${run.data.runId}/finish`, { distance: d, coins: 50 })).status, 409);

  // --- Tienda ---
  const poor = await call('POST', '/api/shop/buy', { itemId: 'skin:ninja' });
  assert.equal(poor.status, 402);
  // Con 100 monedas tampoco alcanza para un boost de 250
  const buy = await call('POST', '/api/shop/buy', { itemId: 'consumable:start_magnet' });
  assert.equal(buy.status, 402);
  assert.equal((await call('GET', '/api/me')).data.coins, 100);
});

test('tienda: compra, mejora y equipar con saldo', async () => {
  const call = client(srv.base, initDataFor(2002));
  await call('GET', '/api/me');
  srv.db.prepare('UPDATE users SET coins = 5000 WHERE id = 2002').run();

  const skin = await call('POST', '/api/shop/buy', { itemId: 'skin:ninja' });
  assert.equal(skin.status, 200);
  assert.equal(skin.data.profile.coins, 2000);
  assert.ok(skin.data.profile.skins.includes('ninja'));
  assert.equal((await call('POST', '/api/shop/buy', { itemId: 'skin:ninja' })).status, 409);

  const eq = await call('POST', '/api/shop/equip', { skinId: 'ninja' });
  assert.equal(eq.data.profile.equippedSkin, 'ninja');
  assert.equal((await call('POST', '/api/shop/equip', { skinId: 'gold' })).status, 403);

  const up = await call('POST', '/api/shop/buy', { itemId: 'upgrade:magnet' });
  assert.equal(up.data.profile.upgrades.magnet, 1);
  assert.equal(up.data.profile.coins, 1500);

  const cons = await call('POST', '/api/shop/buy', { itemId: 'consumable:start_shield' });
  assert.equal(cons.data.profile.consumables.start_shield, 1);

  // Usar el consumible descuenta stock
  const run = await call('POST', '/api/runs/start', { items: ['start_shield'] });
  assert.deepEqual(run.data.items, ['start_shield']);
  assert.equal((await call('GET', '/api/me')).data.consumables.start_shield, 0);
  await new Promise((r) => setTimeout(r, 1600));
  const again = await call('POST', '/api/runs/start', { items: ['start_shield'] });
  assert.equal(again.status, 400);
  assert.equal(again.data.error, 'not_enough_items');

  // Ledger consistente con el saldo
  const { total } = srv.db.prepare('SELECT SUM(delta) AS total FROM coin_ledger WHERE user_id = 2002').get();
  const { coins } = srv.db.prepare('SELECT coins FROM users WHERE id = 2002').get();
  assert.equal(coins - 5000, total); // los 5000 se cargaron a mano en el test
});

test('anti-cheat vía API: monedas imposibles se recortan y se marcan', async () => {
  const call = client(srv.base, initDataFor(3003));
  const run = await call('POST', '/api/runs/start', { items: [] });
  const fin = await call('POST', `/api/runs/${run.data.runId}/finish`, { distance: 50000, coins: 100000 });
  assert.equal(fin.status, 200);
  assert.equal(fin.data.flagged, true);
  assert.ok(fin.data.score < 200);
  assert.ok(fin.data.coinsAwarded < 100);
});

test('no se puede revivir la partida de otro usuario', async () => {
  const a = client(srv.base, initDataFor(4004));
  const b = client(srv.base, initDataFor(5005));
  const run = await a('POST', '/api/runs/start', { items: [] });
  const r = await b('POST', '/api/ads/request', { type: 'revive', runId: run.data.runId });
  assert.equal(r.status, 409);
});

test('ranking', async () => {
  const call = client(srv.base, initDataFor(1001));
  const lb = await call('GET', '/api/leaderboard');
  assert.equal(lb.status, 200);
  assert.ok(lb.data.top.length >= 1);
  assert.equal(lb.data.top.find((r) => r.isMe)?.isMe, true);
});
