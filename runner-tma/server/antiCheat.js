// =====================================================================
// Anti-cheat de partidas.
//
// Idea: el servidor genera la SEED de la pista y anota la hora de inicio.
// Al terminar, el cliente reporta distancia y monedas. Con eso:
//   1) Distancia <= lo físicamente alcanzable en el tiempo real transcurrido.
//   2) Monedas   <= monedas que EXISTÍAN en la pista (misma seed) hasta esa distancia.
// Si algo excede el límite, se recorta y la partida queda marcada.
//
// Limitación honesta: un bot que juegue "perfecto" no se detecta así
// (pasa en cualquier juego con lógica en el cliente). Como las monedas no
// tienen valor en dinero real, el daño se limita al ranking.
// =====================================================================
import { maxDistanceForTime } from '../shared/gameConfig.js';
import { countCoinsUpTo } from '../shared/track.js';

// Margen de tolerancia (lag de red, reloj, redondeos).
const TIME_SLACK_SEC = 3;
const DIST_TOLERANCE = 1.03;
const MAGNET_MARGIN = 16; // el imán agarra monedas un poco por delante
const MAX_RUN_SECONDS = 3 * 60 * 60;

export function evaluateRun({ seed, startedAt, now, reportedDistance, reportedCoins }) {
  const reasons = [];
  const elapsedSec = Math.max(0, (now - startedAt) / 1000);

  let distance = Number(reportedDistance);
  let coins = Number(reportedCoins);
  if (!Number.isFinite(distance) || distance < 0) {
    distance = 0;
    reasons.push('distance_invalid');
  }
  if (!Number.isInteger(coins) || coins < 0) {
    coins = 0;
    reasons.push('coins_invalid');
  }

  // 1) Distancia máxima posible según el reloj del SERVIDOR.
  const maxDist = maxDistanceForTime(Math.min(elapsedSec, MAX_RUN_SECONDS) + TIME_SLACK_SEC) * DIST_TOLERANCE;
  if (distance > maxDist) {
    reasons.push(`distance_too_fast(${distance.toFixed(0)}>${maxDist.toFixed(0)})`);
    distance = maxDist;
  }

  // 2) Monedas máximas que existían hasta esa distancia.
  const maxCoins = countCoinsUpTo(seed, distance + MAGNET_MARGIN);
  if (coins > maxCoins) {
    reasons.push(`coins_exceed(${coins}>${maxCoins})`);
    coins = maxCoins;
  }

  return {
    distance,
    coins,
    score: Math.floor(distance),
    flagged: reasons.length > 0,
    reasons,
    elapsedSec,
  };
}
