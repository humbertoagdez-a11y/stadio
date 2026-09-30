import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TrackGenerator, countCoinsUpTo } from '../shared/track.js';
import { maxDistanceForTime, minTimeForDistance, speedAt, GAME } from '../shared/gameConfig.js';
import { evaluateRun } from '../server/antiCheat.js';

test('la pista es determinística para la misma seed', () => {
  const a = new TrackGenerator(1234);
  const b = new TrackGenerator(1234);
  for (let i = 0; i < 50; i++) assert.deepEqual(a.nextChunk(), b.nextChunk());
});

test('siempre hay un carril libre de vehículos continuo entre filas', () => {
  const isVehicle = (k) => k === 'van' || k === 'truck';
  for (let seed = 1; seed < 300; seed++) {
    const gen = new TrackGenerator(seed);
    const rows = new Map(); // row -> carriles con vehículo
    for (let c = 0; c < 60; c++) {
      for (const it of gen.nextChunk().items) {
        if (it.row === undefined) continue;
        if (!rows.has(it.row)) rows.set(it.row, new Set());
        if (isVehicle(it.kind)) rows.get(it.row).add(it.lane);
      }
    }
    for (const [row, blocked] of rows) {
      assert.ok(blocked.size <= 2, `seed ${seed}: fila ${row} bloqueada`);
      const prev = rows.get(row - 1);
      if (!prev) continue; // fila anterior vacía = todos los carriles libres
      const shared = [-1, 0, 1].some((l) => !prev.has(l) && !blocked.has(l));
      assert.ok(shared, `seed ${seed}: sin camino continuo entre filas ${row - 1} y ${row}`);
    }
  }
});

test('maxDistanceForTime y minTimeForDistance son inversas', () => {
  for (const t of [1, 10, 60, 120, 300, 900]) {
    const d = maxDistanceForTime(t);
    assert.ok(Math.abs(minTimeForDistance(d) - t) < 1e-6);
  }
});

test('la simulación del cliente nunca supera el límite teórico del servidor', () => {
  // Simulamos el loop del cliente a 60 FPS (y a 20 FPS con dt máximo)
  for (const dt of [1 / 60, 0.05]) {
    let d = 0;
    let t = 0;
    while (t < 400) {
      d += speedAt(d) * dt;
      t += dt;
      assert.ok(d <= maxDistanceForTime(t) + 1e-6, `dt=${dt} t=${t}`);
    }
  }
});

test('anti-cheat: acepta partida legítima', () => {
  const seed = 99;
  const startedAt = 0;
  const now = 60_000;
  let d = 0;
  for (let t = 0; t < 58; t += 1 / 60) d += speedAt(d) / 60;
  const r = evaluateRun({ seed, startedAt, now, reportedDistance: d, reportedCoins: 10 });
  assert.equal(r.flagged, false);
  assert.equal(r.score, Math.floor(d));
});

test('anti-cheat: recorta distancia imposible y monedas inexistentes', () => {
  const r = evaluateRun({ seed: 5, startedAt: 0, now: 10_000, reportedDistance: 99999, reportedCoins: 99999 });
  assert.equal(r.flagged, true);
  assert.ok(r.distance <= maxDistanceForTime(13) * 1.03 + 1e-9);
  assert.equal(r.coins, countCoinsUpTo(5, r.distance + 16));
});

test('anti-cheat: rechaza valores basura', () => {
  const r = evaluateRun({ seed: 5, startedAt: 0, now: 10_000, reportedDistance: 'abc', reportedCoins: -3 });
  assert.equal(r.flagged, true);
  assert.equal(r.distance, 0);
  assert.equal(r.coins, 0);
  assert.equal(GAME.MAX_REVIVES, 3);
});
