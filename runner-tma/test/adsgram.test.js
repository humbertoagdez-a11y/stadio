import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, initDataFor, client } from './helpers.js';

// Con ADSGRAM_REWARD_SECRET, la recompensa exige el callback server-to-server.
let srv;
const SECRET = 'supersecreto123';
before(async () => {
  srv = await startTestServer({ ADS_PROVIDER: 'adsgram', ADSGRAM_BLOCK_ID: '1234', ADSGRAM_REWARD_SECRET: SECRET });
});
after(async () => { await srv.close(); });

test('sin callback de Adsgram no hay recompensa', async () => {
  const call = client(srv.base, initDataFor(7007));
  const ad = await call('POST', '/api/ads/request', { type: 'multiplier' });
  assert.equal(ad.status, 200);
  assert.equal(ad.data.blockId, '1234');
  const claim = await call('POST', '/api/ads/claim', { adId: ad.data.adId }); // espera ~6 s
  assert.equal(claim.status, 409);
  assert.equal(claim.data.error, 'not_verified');
});

test('callback con secreto inválido => 403', async () => {
  const res = await fetch(`${srv.base}/api/ads/adsgram/reward?userid=7007&secret=malo`);
  assert.equal(res.status, 403);
});

test('callback válido => recompensa entregada', async () => {
  const call = client(srv.base, initDataFor(8008));
  const ad = await call('POST', '/api/ads/request', { type: 'multiplier' });
  const cb = await fetch(`${srv.base}/api/ads/adsgram/reward?userid=8008&secret=${SECRET}`);
  assert.equal(cb.status, 200);
  const claim = await call('POST', '/api/ads/claim', { adId: ad.data.adId });
  assert.equal(claim.status, 200);
  assert.equal(claim.data.profile.pendingMultiplier, true);
});
