// =====================================================================
// Catálogo de la tienda. El SERVIDOR es la única fuente de verdad de
// precios (el cliente sólo lo usa para mostrar). Ajustá precios acá.
//
// Referencia de economía: una partida normal da ~150–400 monedas
// (el doble con el anuncio x2). Una skin de 3.000 ≈ 8–10 partidas.
// =====================================================================

export const SKINS = [
  {
    id: 'classic', name: 'Ladrón Clásico', price: 0,
    colors: { shirt: '#f5f5f5', stripe: '#1b1b1b', pants: '#2b3a55', mask: '#111111', skin: '#e0ac69', bag: '#8d6e3f', accent: '#ffd23f' },
  },
  {
    id: 'ninja', name: 'Ninja Nocturno', price: 3000,
    colors: { shirt: '#222831', stripe: '#393e46', pants: '#1a1a1a', mask: '#c0392b', skin: '#e0ac69', bag: '#2d2d2d', accent: '#e74c3c' },
  },
  {
    id: 'hacker', name: 'Hacker Neón', price: 7500,
    colors: { shirt: '#0f0f23', stripe: '#00ff9c', pants: '#16213e', mask: '#00ff9c', skin: '#c68642', bag: '#0a3d62', accent: '#00ff9c' },
  },
  {
    id: 'clown', name: 'Payaso del Atraco', price: 15000,
    colors: { shirt: '#ff4fa3', stripe: '#ffe600', pants: '#3d5afe', mask: '#ffffff', skin: '#ffe0bd', bag: '#00c853', accent: '#ff1744' },
  },
  {
    id: 'gold', name: 'Rey del Oro', price: 40000,
    colors: { shirt: '#ffd700', stripe: '#b8860b', pants: '#3e2723', mask: '#000000', skin: '#e0ac69', bag: '#ffd700', accent: '#fff59d' },
  },
];

// Mejoras permanentes: cada nivel alarga la duración del power-up en pista.
export const UPGRADES = [
  {
    id: 'magnet', name: 'Imán de monedas', icon: '🧲',
    durations: [8, 10, 12, 14, 17, 20],       // seg por nivel (0..5)
    prices: [500, 1200, 2500, 5000, 10000],   // precio para subir a nivel 1..5
  },
  {
    id: 'shield', name: 'Escudo', icon: '🛡️',
    durations: [6, 8, 10, 12, 15, 18],
    prices: [600, 1400, 3000, 6000, 12000],
  },
];

// Consumibles: se activan al iniciar una partida (se gastan de a 1).
export const CONSUMABLES = [
  { id: 'start_shield', name: 'Arranque con escudo', icon: '🛡️', price: 350, maxStack: 99, grants: 'shield' },
  { id: 'start_magnet', name: 'Arranque con imán', icon: '🧲', price: 250, maxStack: 99, grants: 'magnet' },
];

export const DEFAULT_SKIN = 'classic';

export function findSkin(id) {
  return SKINS.find((s) => s.id === id) || null;
}
export function findUpgrade(id) {
  return UPGRADES.find((u) => u.id === id) || null;
}
export function findConsumable(id) {
  return CONSUMABLES.find((c) => c.id === id) || null;
}
