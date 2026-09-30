// =====================================================================
// Generador de pista DETERMINÍSTICO (misma seed => misma pista).
// Lo usa el cliente para dibujar/jugar y el servidor para saber
// cuántas monedas existían realmente hasta cierta distancia.
// =====================================================================
import { GAME } from './gameConfig.js';

// PRNG rápido de 32 bits. Sólo usa aritmética entera => mismo resultado
// en cualquier navegador y en Node.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Tipos de objeto en la pista.
//  barrier : valla baja  -> saltar
//  bar     : cinta/cartel alto -> rodar por debajo
//  van     : furgón policial (bloquea carril) -> cambiar de carril
//  truck   : camión largo (bloquea carril)
//  coin    : moneda
//  magnet / shield : power-ups
export const OBSTACLE_DEPTH = { barrier: 0.5, bar: 0.4, van: 5, truck: 10 };

const LANES = [-1, 0, 1];

export class TrackGenerator {
  constructor(seed) {
    this.rand = mulberry32(seed);
    this.chunkIndex = 0;
    this.nextId = 1;
    // Carriles sin vehículo de la fila anterior (para garantizar un camino continuo).
    this.prevOpen = new Set(LANES);
    this.rowCount = 0;
  }

  randInt(min, max) {
    return min + Math.floor(this.rand() * (max - min + 1));
  }

  pick(arr) {
    return arr[Math.floor(this.rand() * arr.length)];
  }

  push(items, obj) {
    obj.id = this.nextId++;
    items.push(obj);
  }

  // Línea de monedas en un carril.
  coinLine(items, lane, z0, count, spacing = 2.5) {
    for (let i = 0; i < count; i++) {
      this.push(items, { kind: 'coin', lane, z: z0 + i * spacing, y: 0.9 });
    }
  }

  // Arco de monedas (para agarrar saltando sobre una valla).
  coinArc(items, lane, zCenter) {
    const n = 7;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1); // 0..1
      const z = zCenter - 6 + t * 12;
      const y = 0.9 + Math.sin(t * Math.PI) * 1.9;
      this.push(items, { kind: 'coin', lane, z, y });
    }
  }

  /** Genera el siguiente bloque de pista. Devuelve { start, end, items }. */
  nextChunk() {
    const idx = this.chunkIndex++;
    const start = idx * GAME.CHUNK_LENGTH;
    const end = start + GAME.CHUNK_LENGTH;
    const items = [];
    // Dificultad 0..1 que sube con los bloques.
    const diff = Math.min(1, idx / 40);

    // Zona segura al comienzo: sólo monedas.
    if (start < GAME.SAFE_START) {
      this.coinLine(items, 0, Math.max(start, 12), 10);
      return { start, end, items };
    }

    // Filas de obstáculos: separación decreciente con la dificultad.
    const gap = 22 - diff * 8; // 22 → 14 unidades entre filas
    let z = start + 4 + this.rand() * 4;
    while (z < end - 6) {
      this.generateRow(items, z, diff);
      z += gap + this.rand() * 6;
    }

    // Power-up ocasional en un carril libre de obstáculos cerca.
    if (this.rand() < 0.12) {
      const kind = this.rand() < 0.5 ? 'magnet' : 'shield';
      const pz = start + 2 + this.rand() * (GAME.CHUNK_LENGTH - 4);
      const lane = this.pick(LANES);
      const blocked = items.some(
        (o) => o.kind !== 'coin' && o.lane === lane &&
          pz >= o.z - 3 && pz <= o.z + (OBSTACLE_DEPTH[o.kind] || 0) + 3,
      );
      if (!blocked) this.push(items, { kind, lane, z: pz, y: 1.0 });
    }

    return { start, end, items };
  }

  // Una "fila": para cada carril decide obstáculo o nada,
  // garantizando siempre al menos un carril transitable sin vehículo.
  generateRow(items, z, diff) {
    const row = this.rowCount++;
    const kinds = [];
    for (let i = 0; i < 3; i++) {
      const r = this.rand();
      if (r < 0.28 + diff * 0.2) kinds.push(this.rand() < 0.55 ? 'van' : 'truck');
      else if (r < 0.48 + diff * 0.25) kinds.push('barrier');
      else if (r < 0.62 + diff * 0.25) kinds.push('bar');
      else kinds.push(null);
    }
    // Nunca 3 vehículos en la misma fila: liberamos uno al azar.
    const isVehicle = (k) => k === 'van' || k === 'truck';
    if (kinds.filter(isVehicle).length >= 3) kinds[this.randInt(0, 2)] = null;

    // Camino garantizado: al menos un carril sin vehículo en ESTA fila y en la
    // anterior, así el jugador nunca queda encerrado entre camiones.
    const open = LANES.filter((l, i) => !isVehicle(kinds[i]));
    if (!open.some((l) => this.prevOpen.has(l))) {
      const keep = [...this.prevOpen][this.randInt(0, this.prevOpen.size - 1)];
      kinds[LANES.indexOf(keep)] = null;
    }
    this.prevOpen = new Set(LANES.filter((l, i) => !isVehicle(kinds[i])));

    kinds.forEach((kind, i) => {
      const lane = LANES[i];
      if (kind) {
        this.push(items, { kind, lane, z, row });
        // Monedas en arco sobre las vallas bajas (premio al saltar).
        if (kind === 'barrier' && this.rand() < 0.45) this.coinArc(items, lane, z + 0.25);
      } else if (this.rand() < 0.55) {
        // Carril libre: línea de monedas que "guía" al jugador.
        this.coinLine(items, lane, z - 4, this.randInt(4, 6));
      }
    });
  }
}

/**
 * Cantidad TOTAL de monedas generadas con `seed` cuya z <= `distance`.
 * El servidor la usa como tope: nadie puede juntar más monedas de las que existían.
 */
export function countCoinsUpTo(seed, distance) {
  const gen = new TrackGenerator(seed);
  let total = 0;
  for (;;) {
    const chunk = gen.nextChunk();
    if (chunk.start > distance) break;
    for (const it of chunk.items) {
      if (it.kind === 'coin' && it.z <= distance) total++;
    }
  }
  return total;
}
