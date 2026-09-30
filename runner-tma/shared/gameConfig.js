// =====================================================================
// Constantes de juego COMPARTIDAS entre cliente y servidor.
// El servidor usa estas mismas fórmulas para validar las partidas:
// si cambiás algo acá, cambia para ambos lados a la vez.
// =====================================================================

export const GAME = {
  LANE_WIDTH: 2.2,        // ancho de carril en unidades de mundo
  SPEED_START: 14,        // unidades/seg al arrancar
  SPEED_MAX: 34,          // velocidad tope
  SPEED_ACCEL: 0.008,     // v(d) = min(MAX, START + ACCEL * d)
  CHUNK_LENGTH: 60,       // largo de cada bloque de pista generado
  SAFE_START: 45,         // metros iniciales sin obstáculos
  MAGNET_RANGE: 14,       // alcance del imán (hacia adelante)
  MAX_REVIVES: 3,         // reactivaciones por partida vía anuncio
  REVIVE_WINDOW_SEC: 5,   // segundos para decidir si revivir
  REVIVE_CLEAR_DIST: 30,  // al revivir se limpian obstáculos en estos metros
  GRAVITY: 34,
  JUMP_VELOCITY: 11.5,
};

// Velocidad en función de la distancia recorrida.
export function speedAt(distance) {
  return Math.min(GAME.SPEED_MAX, GAME.SPEED_START + GAME.SPEED_ACCEL * distance);
}

// Distancia a partir de la cual se alcanza la velocidad máxima.
const D_MAX = (GAME.SPEED_MAX - GAME.SPEED_START) / GAME.SPEED_ACCEL;
// Tiempo (seg) que se tarda en llegar a D_MAX yendo siempre a la velocidad teórica.
const T_MAX = Math.log(GAME.SPEED_MAX / GAME.SPEED_START) / GAME.SPEED_ACCEL;

/**
 * Distancia MÁXIMA físicamente alcanzable en `t` segundos.
 * Resuelve dd/dt = v0 + a·d  →  d(t) = (v0/a)(e^(a·t) − 1), luego lineal a vmax.
 * El servidor la usa para rechazar distancias imposibles.
 */
export function maxDistanceForTime(t) {
  if (t <= 0) return 0;
  const { SPEED_START: v0, SPEED_ACCEL: a, SPEED_MAX: vmax } = GAME;
  if (t <= T_MAX) return (v0 / a) * (Math.exp(a * t) - 1);
  return D_MAX + vmax * (t - T_MAX);
}

/** Tiempo mínimo (seg) necesario para recorrer `d` (inversa de la anterior). */
export function minTimeForDistance(d) {
  if (d <= 0) return 0;
  const { SPEED_START: v0, SPEED_ACCEL: a, SPEED_MAX: vmax } = GAME;
  if (d <= D_MAX) return Math.log(1 + (a * d) / v0) / a;
  return T_MAX + (d - D_MAX) / vmax;
}
