// =====================================================================
// Renderer pseudo-3D en Canvas 2D (sin librerías).
// Proyección en perspectiva simple: cámara detrás y arriba del jugador.
//   pantallaX = cx + x · (f / zc)
//   pantallaY = horizonte + (altCam − y) · (f / zc)
// Todo se dibuja con primitivas: no hay imágenes que descargar
// (carga instantánea dentro de Telegram).
// =====================================================================
import { GAME } from '/shared/gameConfig.js';
import { OBSTACLE_DEPTH } from '/shared/track.js';

const LW = GAME.LANE_WIDTH;
const ROAD_HALF = LW * 1.5;
const FAR = 150;          // distancia de dibujado
const CAM_BACK = 5.5;     // cámara detrás del jugador
const SIDEWALK = 2.2;
const BLEN = 9;           // separación entre edificios
const B_DEPTH = 7;        // profundidad de cada edificio

const BUILDING_PALETTE = [
  { front: '#232a4d', side: '#181d38', roof: '#2d3560' },
  { front: '#2b2140', side: '#1d162e', roof: '#3a2c56' },
  { front: '#1f3140', side: '#15222e', roof: '#294154' },
  { front: '#302634', side: '#211a24', roof: '#3f3244' },
];
const NEON = ['#ff2e88', '#22d3ee', '#a3ff12', '#ffb020'];

// Hash determinístico -> [0,1). Sirve para que edificios/ventanas no "parpadeen".
function hash(a, b = 0, c = 0) {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.particles = [];
    this.shake = 0;
    this.stars = Array.from({ length: 70 }, (_, i) => ({ x: hash(i, 1), y: hash(i, 2), r: hash(i, 3) * 1.3 + 0.3 }));
    this.skyline = Array.from({ length: 48 }, (_, i) => 0.25 + hash(i, 7) * 0.75);
    this.resize();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2); // >2 no se nota y cuesta FPS
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.W = w;
    this.H = h;
    // La ruta ocupa ~94% del ancho a la altura del jugador (limitado en pantallas horizontales).
    const usable = Math.min(w, h * 0.72);
    this.f = (usable * 0.47 * CAM_BACK) / ROAD_HALF;
    this.cx = w / 2;
    this.horizonY = h * 0.3;
    this.groundY = h * 0.84; // donde pisa el jugador
    this.camH = ((this.groundY - this.horizonY) * CAM_BACK) / this.f;
    // z relativa correspondiente al borde inferior de la pantalla
    this.nearRel = (this.camH * this.f) / (h - this.horizonY) - CAM_BACK;
  }

  proj(x, y, zRel) {
    const s = this.f / (zRel + CAM_BACK);
    return { x: this.cx + x * s, y: this.horizonY + (this.camH - y) * s, s };
  }

  quad(a, b, c, d, color) {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.lineTo(d.x, d.y);
    ctx.closePath();
    ctx.fill();
  }

  // Caja 3D: cara lateral visible + techo + frente. Devuelve el rect del frente.
  box(x0, x1, y0, y1, z0, z1, c) {
    const near = this.nearRel + 0.05;
    if (z1 < near) return null;
    const clipped = z0 < near;
    if (clipped) z0 = near;
    const P = (x, y, z) => this.proj(x, y, z);
    if (x0 > 0) this.quad(P(x0, y0, z0), P(x0, y1, z0), P(x0, y1, z1), P(x0, y0, z1), c.side);
    else if (x1 < 0) this.quad(P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z1), P(x1, y0, z1), c.side);
    if (y1 < this.camH) this.quad(P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1), c.top);
    const a = P(x0, y1, z0);
    const b = P(x1, y0, z0);
    this.ctx.fillStyle = c.front;
    this.ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
    return { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y, s: a.s, clipped };
  }

  // ------------------------------------------------------------------
  draw(game, dt) {
    const ctx = this.ctx;
    const d = game.distance;
    const t = game.clock;
    ctx.save();
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt);
      const m = this.shake * 14;
      ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
    }
    this.drawSky(d);
    this.drawGround(d);
    this.drawBuildings(d);
    this.drawFog();

    // Objetos de pista: de lejos a cerca (algoritmo del pintor).
    const visible = [];
    for (const o of game.objects) {
      if (o.gone) continue;
      const rel = o.z - d;
      const depth = OBSTACLE_DEPTH[o.kind] || 0;
      if (rel > FAR || rel + depth < this.nearRel) continue;
      visible.push(o);
    }
    visible.sort((a, b) => b.z - a.z);
    let playerDrawn = false;
    for (const o of visible) {
      if (!playerDrawn && o.z - d < 0) {
        this.drawPlayer(game);
        playerDrawn = true;
      }
      this.drawObject(o, o.z - d, t);
    }
    if (!playerDrawn) this.drawPlayer(game);

    this.drawParticles(dt);
    this.drawSirens(t, game.state === 'crashed');
    ctx.restore();
  }

  drawSky(d) {
    const { ctx, W, H, horizonY } = this;
    const g = ctx.createLinearGradient(0, 0, 0, horizonY);
    g.addColorStop(0, '#05071a');
    g.addColorStop(0.7, '#1a1040');
    g.addColorStop(1, '#3b1a5c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, horizonY + 2);
    ctx.fillStyle = '#ffffff';
    for (const s of this.stars) {
      ctx.globalAlpha = 0.4 + 0.6 * s.r / 1.6;
      ctx.fillRect(s.x * W, s.y * horizonY * 0.8, s.r, s.r);
    }
    ctx.globalAlpha = 1;
    // Luna
    ctx.fillStyle = '#fdf6d8';
    ctx.beginPath();
    ctx.arc(W * 0.8, H * 0.08, Math.min(W, H) * 0.045, 0, Math.PI * 2);
    ctx.fill();
    // Skyline lejano con leve paralaje
    const n = this.skyline.length;
    const bw = W / (n - 8);
    const off = (d * 0.6) % bw;
    ctx.fillStyle = '#120d2b';
    for (let i = 0; i < n; i++) {
      const hgt = this.skyline[(i + Math.floor(d * 0.6 / bw)) % n] * H * 0.11;
      ctx.fillRect(i * bw - off - bw * 4, horizonY - hgt, bw + 1, hgt + 2);
    }
  }

  drawGround(d) {
    const { ctx, W, H, horizonY } = this;
    const near = this.nearRel - 0.5;
    ctx.fillStyle = '#1b1f2e'; // vereda
    ctx.fillRect(0, horizonY, W, H - horizonY);
    const P = (x, y, z) => this.proj(x, y, z);
    // Asfalto
    this.quad(P(-ROAD_HALF, 0, FAR), P(ROAD_HALF, 0, FAR), P(ROAD_HALF, 0, near), P(-ROAD_HALF, 0, near), '#262a38');
    // Franjas alternadas: dan sensación de velocidad
    const bandLen = 8;
    for (let k = Math.floor((d + near) / bandLen); k * bandLen < d + FAR; k++) {
      if (k % 2) continue;
      const z0 = Math.max(k * bandLen - d, near);
      const z1 = Math.min(k * bandLen + bandLen - d, FAR);
      if (z1 <= z0) continue;
      this.quad(P(-ROAD_HALF, 0, z1), P(ROAD_HALF, 0, z1), P(ROAD_HALF, 0, z0), P(-ROAD_HALF, 0, z0), '#2c3142');
    }
    // Líneas de carril punteadas
    const dash = 6;
    for (const lx of [-LW / 2, LW / 2]) {
      for (let k = Math.floor((d + near) / dash); k * dash < d + FAR * 0.8; k++) {
        const z0 = Math.max(k * dash - d, near);
        const z1 = k * dash + 3 - d;
        if (z1 <= z0) continue;
        this.quad(P(lx - 0.07, 0, z1), P(lx + 0.07, 0, z1), P(lx + 0.07, 0, z0), P(lx - 0.07, 0, z0), 'rgba(220,226,240,0.55)');
      }
    }
    // Cordones amarillos
    for (const sx of [-1, 1]) {
      const a = sx * ROAD_HALF;
      const b = sx * (ROAD_HALF + 0.25);
      this.quad(P(a, 0, FAR), P(b, 0, FAR), P(b, 0, near), P(a, 0, near), '#c9a227');
    }
  }

  drawBuildings(d) {
    const near = this.nearRel;
    const iStart = Math.floor((d + near - B_DEPTH) / BLEN);
    const iEnd = Math.floor((d + FAR) / BLEN);
    for (let i = iEnd; i >= iStart; i--) {
      for (const side of [-1, 1]) this.drawBuilding(i, side, d);
    }
    this.ctx.globalAlpha = 1;
  }

  drawBuilding(i, side, d) {
    if (hash(i, side + 3, 9) < 0.1) return; // callejón
    const ctx = this.ctx;
    const h = 5 + hash(i, side + 5) * 12;
    const z0 = i * BLEN - d;
    const z1 = z0 + B_DEPTH;
    const xi = side * (ROAD_HALF + SIDEWALK);
    const xo = side * (ROAD_HALF + SIDEWALK + 8);
    const pal = BUILDING_PALETTE[Math.floor(hash(i, side, 3) * BUILDING_PALETTE.length)];
    ctx.globalAlpha = Math.max(0, Math.min(1, (FAR - z0) / (FAR * 0.4)));
    const x0 = Math.min(xi, xo);
    const x1 = Math.max(xi, xo);
    const front = this.box(x0, x1, 0, h, z0, z1, { front: pal.front, side: pal.side, top: pal.roof });
    if (!front || z0 > 95) return;

    // Ventanas en la cara lateral (la que mira a la calle)
    const near = this.nearRel + 0.1;
    for (let y = 1.2, row = 0; y < h - 0.8; y += 1.8, row++) {
      for (let c = 0; c < 4; c++) {
        const zz = z0 + 0.8 + c * 1.6;
        if (zz < near) continue;
        if (hash(i * 7 + c, side, row) < 0.62) continue;
        this.quad(this.proj(xi, y, zz), this.proj(xi, y + 1, zz), this.proj(xi, y + 1, zz + 0.9), this.proj(xi, y, zz + 0.9), '#ffcf6b');
      }
    }
    // Ventanas del frente
    if (!front.clipped) {
      const s = front.s;
      ctx.fillStyle = '#ffd98a';
      for (let y = 1.2, row = 0; y < h - 0.8; y += 1.8, row++) {
        for (let c = 0; c < 4; c++) {
          if (hash(i * 13 + c, side + 7, row) < 0.6) continue;
          ctx.fillRect(front.x + (0.8 + c * 1.9) * s, front.y + front.h - (y + 1) * s, 0.9 * s, 1 * s);
        }
      }
    }
    // Cartel de neón ocasional
    if (hash(i, side, 11) > 0.78 && h > 7 && z0 > near) {
      const col = NEON[Math.floor(hash(i, side, 12) * NEON.length)];
      this.quad(this.proj(xi, 3, z0 + 0.3), this.proj(xi, 6, z0 + 0.3), this.proj(xi, 6, z0 + 0.9), this.proj(xi, 3, z0 + 0.9), col);
    }
  }

  drawFog() {
    const { ctx, W, horizonY, H } = this;
    const g = ctx.createLinearGradient(0, horizonY - H * 0.04, 0, horizonY + H * 0.1);
    g.addColorStop(0, 'rgba(59,26,92,0)');
    g.addColorStop(0.35, 'rgba(59,26,92,0.85)');
    g.addColorStop(1, 'rgba(59,26,92,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, horizonY - H * 0.04, W, H * 0.14);
  }

  // ------------------------------------------------------------------
  drawObject(o, rel, t) {
    const x = o.lane * LW;
    const ctx = this.ctx;
    ctx.globalAlpha = Math.max(0, Math.min(1, (FAR - rel) / (FAR * 0.25)));
    switch (o.kind) {
      case 'coin': {
        const p = this.proj(x, o.y, rel);
        const r = 0.36 * p.s;
        if (r < 0.8) break;
        const spin = Math.abs(Math.cos(t * 5 + o.id));
        ctx.fillStyle = '#b8860b';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, Math.max(r * spin, r * 0.15) + r * 0.08, r * 1.04, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffd23f';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, Math.max(r * spin, r * 0.12), r, 0, 0, Math.PI * 2);
        ctx.fill();
        if (spin > 0.5) {
          ctx.fillStyle = '#fff6bf';
          ctx.fillRect(p.x - r * 0.15 * spin, p.y - r * 0.55, r * 0.3 * spin, r * 0.35);
        }
        break;
      }
      case 'magnet':
      case 'shield': {
        const p = this.proj(x, o.y + Math.sin(t * 4) * 0.15, rel);
        const r = 0.5 * p.s;
        if (r < 1) break;
        ctx.fillStyle = o.kind === 'magnet' ? 'rgba(255,60,90,0.35)' : 'rgba(34,211,238,0.35)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 1.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = `${Math.round(r * 1.3)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(o.kind === 'magnet' ? '🧲' : '🛡️', p.x, p.y + r * 0.05);
        break;
      }
      case 'barrier': {
        // Valla policial baja (saltar)
        const f = this.box(x - 0.9, x + 0.9, 0.35, 1.0, rel, rel + 0.5, { front: '#f2f2f2', side: '#bdbdbd', top: '#ffffff' });
        if (f && !f.clipped) {
          ctx.fillStyle = '#e53935';
          const n = 5;
          for (let k = 0; k < n; k += 2) ctx.fillRect(f.x + (f.w / n) * k, f.y, f.w / n, f.h);
          // patas
          const legW = 0.12 * f.s;
          ctx.fillStyle = '#555';
          ctx.fillRect(f.x + f.w * 0.1, f.y + f.h, legW, 0.35 * f.s);
          ctx.fillRect(f.x + f.w * 0.9 - legW, f.y + f.h, legW, 0.35 * f.s);
        }
        break;
      }
      case 'bar': {
        // Cinta/cartel alto (rodar por debajo)
        const poleC = { front: '#6b7280', side: '#4b5563', top: '#9ca3af' };
        this.box(x - 1.05, x - 0.9, 0, 1.9, rel, rel + 0.15, poleC);
        this.box(x + 0.9, x + 1.05, 0, 1.9, rel, rel + 0.15, poleC);
        const f = this.box(x - 1.05, x + 1.05, 1.15, 1.85, rel, rel + 0.3, { front: '#facc15', side: '#ca8a04', top: '#fde047' });
        if (f && !f.clipped && f.h > 8) {
          ctx.fillStyle = '#111';
          ctx.font = `900 ${Math.round(f.h * 0.55)}px system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('POLICE LINE', f.x + f.w / 2, f.y + f.h / 2);
        }
        break;
      }
      case 'van': {
        const f = this.box(x - 0.95, x + 0.95, 0.25, 2.5, rel, rel + 5, { front: '#e8eef7', side: '#b8c4d8', top: '#f4f7fb' });
        // ruedas (bajo el chasis)
        this.box(x - 0.9, x + 0.9, 0, 0.3, rel + 0.4, rel + 4.6, { front: '#111', side: '#111', top: '#111' });
        if (f && !f.clipped) {
          const s = f.s;
          ctx.fillStyle = '#1e3a8a'; // franja azul
          ctx.fillRect(f.x, f.y + f.h * 0.55, f.w, f.h * 0.12);
          ctx.fillStyle = '#0f172a'; // parabrisas
          ctx.fillRect(f.x + f.w * 0.1, f.y + f.h * 0.12, f.w * 0.8, f.h * 0.33);
          ctx.fillStyle = '#fef08a'; // faros
          ctx.fillRect(f.x + f.w * 0.06, f.y + f.h * 0.75, f.w * 0.16, f.h * 0.08);
          ctx.fillRect(f.x + f.w * 0.78, f.y + f.h * 0.75, f.w * 0.16, f.h * 0.08);
          // Balizas intermitentes
          const on = Math.floor(t * 6) % 2 === 0;
          const red = on ? '#ef4444' : '#7f1d1d';
          const blue = on ? '#1e3a8a' : '#3b82f6';
          this.box(x - 0.55, x, 2.5, 2.78, rel + 0.8, rel + 1.3, { front: red, side: red, top: red });
          this.box(x, x + 0.55, 2.5, 2.78, rel + 0.8, rel + 1.3, { front: blue, side: blue, top: blue });
          if (s > 12) {
            ctx.fillStyle = '#1e3a8a';
            ctx.font = `900 ${Math.round(0.34 * s)}px system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('POLICÍA', f.x + f.w / 2, f.y + f.h * 0.5);
          }
        }
        break;
      }
      case 'truck': {
        const f = this.box(x - 1.0, x + 1.0, 0.35, 3.1, rel, rel + 10, { front: '#374151', side: '#1f2937', top: '#4b5563' });
        this.box(x - 0.95, x + 0.95, 0, 0.4, rel + 0.5, rel + 9.5, { front: '#0b0b0b', side: '#0b0b0b', top: '#0b0b0b' });
        if (f && !f.clipped) {
          ctx.fillStyle = '#f97316';
          ctx.fillRect(f.x, f.y + f.h * 0.82, f.w, f.h * 0.06);
          ctx.fillStyle = '#111827';
          for (let k = 1; k < 6; k++) ctx.fillRect(f.x + (f.w / 6) * k, f.y + f.h * 0.05, Math.max(1, f.w * 0.015), f.h * 0.72);
          ctx.fillStyle = '#ef4444'; // luces traseras
          ctx.fillRect(f.x + f.w * 0.04, f.y + f.h * 0.9, f.w * 0.1, f.h * 0.05);
          ctx.fillRect(f.x + f.w * 0.86, f.y + f.h * 0.9, f.w * 0.1, f.h * 0.05);
        }
        break;
      }
      default:
        break;
    }
    ctx.globalAlpha = 1;
  }

  drawPlayer(game) {
    const p = game.player;
    const ctx = this.ctx;
    const base = this.proj(p.x, p.y, 0);
    const ground = this.proj(p.x, 0, 0);
    // Sombra
    const k = Math.max(0.3, 1 - p.y / 3);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(ground.x, ground.y, 0.5 * base.s * k, 0.16 * base.s * k, 0, 0, Math.PI * 2);
    ctx.fill();

    // Parpadeo durante la invulnerabilidad
    if (game.invulnT > 0 && Math.floor(game.clock * 12) % 2 === 0) return;

    const mode = p.rollT > 0 ? 'roll' : p.y > 0.05 ? 'jump' : 'run';
    drawThief(ctx, base.x, base.y, base.s, game.colors, p.phase, mode);

    if (game.shieldT > 0) {
      const pulse = 1 + Math.sin(game.clock * 6) * 0.04;
      ctx.strokeStyle = 'rgba(34,211,238,0.9)';
      ctx.fillStyle = 'rgba(34,211,238,0.15)';
      ctx.lineWidth = Math.max(2, base.s * 0.06);
      ctx.beginPath();
      ctx.arc(base.x, base.y - 0.9 * base.s, 1.05 * base.s * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    if (game.magnetT > 0) {
      ctx.font = `${Math.round(base.s * 0.45)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('🧲', base.x, base.y - 2.2 * base.s + Math.sin(game.clock * 8) * 3);
    }
  }

  // Partículas en coordenadas de pantalla (brillos al juntar monedas, etc.)
  spawnSparkles(x, y, color = '#ffd23f', n = 6) {
    if (this.particles.length > 120) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 60 + Math.random() * 120;
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, life: 0.5, max: 0.5, color, size: 2 + Math.random() * 3 });
    }
  }

  drawParticles(dt) {
    const ctx = this.ctx;
    this.particles = this.particles.filter((p) => (p.life -= dt) > 0);
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 300 * dt;
      ctx.globalAlpha = p.life / p.max;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  drawSirens(t, crashed) {
    const { ctx, W, H } = this;
    const on = Math.floor(t * 3) % 2 === 0;
    const intensity = crashed ? 0.45 : 0.16;
    for (const [x, color] of [[0, on ? '239,68,68' : '59,130,246'], [W, on ? '59,130,246' : '239,68,68']]) {
      const g = ctx.createRadialGradient(x, H, 0, x, H, W * 0.7);
      g.addColorStop(0, `rgba(${color},${intensity})`);
      g.addColorStop(1, `rgba(${color},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, H * 0.4, W, H * 0.6);
    }
  }
}

/**
 * Dibuja al ladrón (vista de espaldas). Exportada para usarla también
 * en la vista previa de skins de la tienda.
 *  (x, y) = pies en pantalla, s = píxeles por unidad de mundo.
 */
export function drawThief(ctx, x, y, s, c, phase, mode = 'run') {
  // Rectángulo en unidades de mundo relativas a los pies (y hacia arriba).
  const R = (ux, uy, uw, uh, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(x + ux * s, y - (uy + uh) * s, uw * s, uh * s);
  };
  const C = (ux, uy, ur, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + ux * s, y - uy * s, ur * s, 0, Math.PI * 2);
    ctx.fill();
  };

  if (mode === 'roll') {
    // Hecho bolita rodando
    const cy = 0.45;
    C(0, cy, 0.46, c.shirt);
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y - cy * s, 0.46 * s, 0, Math.PI * 2);
    ctx.clip();
    ctx.translate(x, y - cy * s);
    ctx.rotate(phase * 1.5);
    ctx.fillStyle = c.stripe;
    for (let k = -2; k <= 2; k++) ctx.fillRect(-0.5 * s, (k * 0.2 - 0.05) * s, s, 0.1 * s);
    ctx.restore();
    C(0.05, 0.62, 0.24, c.bag);
    return;
  }

  const swing = Math.sin(phase);
  const bob = mode === 'run' ? Math.abs(Math.cos(phase)) * 0.06 : 0;
  const liftL = mode === 'jump' ? 0.28 : Math.max(0, swing) * 0.3;
  const liftR = mode === 'jump' ? 0.22 : Math.max(0, -swing) * 0.3;

  // Piernas + zapatillas
  R(-0.27, liftL, 0.21, 0.8 - liftL, c.pants);
  R(0.06, liftR, 0.21, 0.8 - liftR, c.pants);
  R(-0.29, liftL, 0.25, 0.12, '#111');
  R(0.04, liftR, 0.25, 0.12, '#111');

  // Brazos
  const armUp = mode === 'jump' ? 0.35 : 0;
  R(-0.47, 0.88 + swing * 0.1 + armUp + bob, 0.14, 0.5, c.shirt);
  R(0.33, 0.88 - swing * 0.1 + armUp + bob, 0.14, 0.5, c.shirt);
  C(-0.4, 0.86 + swing * 0.1 + armUp + bob, 0.08, c.skin);
  C(0.4, 0.86 - swing * 0.1 + armUp + bob, 0.08, c.skin);

  // Torso a rayas (clásico ladrón)
  R(-0.34, 0.76 + bob, 0.68, 0.72, c.shirt);
  for (let k = 0; k < 3; k++) R(-0.34, 0.86 + k * 0.2 + bob, 0.68, 0.09, c.stripe);

  // Cabeza + gorro/máscara
  C(0, 1.68 + bob, 0.23, c.skin);
  ctx.fillStyle = c.mask;
  ctx.beginPath();
  ctx.arc(x, y - (1.7 + bob) * s, 0.24 * s, Math.PI, 0);
  ctx.fill();
  R(-0.24, 1.6 + bob, 0.48, 0.08, c.mask);

  // Bolsa de botín en la espalda
  C(0.04, 1.12 + bob, 0.3, c.bag);
  R(-0.04, 1.4 + bob, 0.16, 0.1, c.bag);
  if (s > 18) {
    ctx.fillStyle = c.accent;
    ctx.font = `900 ${Math.round(0.34 * s)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', x + 0.04 * s, y - (1.1 + bob) * s);
  }
}
