// =====================================================================
// Motor del Endless Runner: física, generación de pista y colisiones.
// La pista sale del generador COMPARTIDO con el servidor (misma seed).
// =====================================================================
import { GAME, speedAt } from '/shared/gameConfig.js';
import { TrackGenerator, OBSTACLE_DEPTH } from '/shared/track.js';
import { Renderer } from './renderer.js';
import { Input } from './input.js';

const LW = GAME.LANE_WIDTH;
const VIEW_AHEAD = 160;     // cuánta pista generar por delante
const PLAYER_HALF = 0.4;    // media profundidad del jugador
const STAND_H = 1.8;
const ROLL_H = 0.8;
const ROLL_TIME = 0.65;
const IDLE_SPEED = 8;       // velocidad del "modo demo" detrás del menú

export class RunnerGame {
  /**
   * hooks: onCoin(total), onCrash(), onPowerup(kind), onShieldBreak(),
   *        onMove(), onJump(), onRoll(), onStumble(), onTick(game)
   */
  constructor(canvas, hooks = {}) {
    this.hooks = hooks;
    this.renderer = new Renderer(canvas);
    this.input = new Input(canvas, (dir) => this.onInput(dir));
    this.colors = null;
    this.clock = 0;          // tiempo visual (nunca se detiene)
    this.state = 'idle';     // idle | running | paused | crashed | over
    this.reset(1);
    window.addEventListener('resize', () => this.renderer.resize());
    this.lastTs = performance.now();
    requestAnimationFrame(this.frame);
  }

  reset(seed) {
    this.distance = 0;
    this.coins = 0;
    this.player = { lane: 0, prevLane: 0, x: 0, y: 0, vy: 0, rollT: 0, queuedRoll: false, fastFall: false, phase: 0 };
    this.magnetT = 0;
    this.shieldT = 0;
    this.invulnT = 0;
    this.gen = new TrackGenerator(seed);
    this.genEnd = 0;
    this.objects = [];
    this.frameCount = 0;
  }

  setColors(colors) {
    this.colors = colors;
  }

  /** Modo demo: el ladrón corre por la ciudad vacía detrás del menú. */
  idle() {
    this.reset(1);
    this.state = 'idle';
  }

  /**
   * opts: { seed, colors, durations: {magnet, shield}, items: ['start_shield', ...] }
   */
  start(opts) {
    this.reset(opts.seed);
    this.colors = opts.colors;
    this.durations = opts.durations;
    for (const item of opts.items || []) {
      if (item === 'start_shield') this.shieldT = this.durations.shield;
      if (item === 'start_magnet') this.magnetT = this.durations.magnet;
    }
    this.state = 'running';
  }

  pause() {
    if (this.state === 'running') this.state = 'paused';
  }

  resume() {
    if (this.state === 'paused') this.state = 'running';
  }

  /** Revivir tras ver el anuncio: limpia obstáculos cercanos y da invulnerabilidad. */
  revive() {
    const d = this.distance;
    for (const o of this.objects) {
      const depth = OBSTACLE_DEPTH[o.kind];
      if (depth === undefined) continue; // monedas y power-ups se quedan
      if (o.z + depth > d - 1 && o.z < d + GAME.REVIVE_CLEAR_DIST) o.gone = true;
    }
    const p = this.player;
    p.y = 0;
    p.vy = 0;
    p.rollT = 0;
    p.queuedRoll = false;
    this.invulnT = 2.5;
    this.state = 'running';
  }

  finish() {
    this.state = 'over';
  }

  getResult() {
    return { distance: Math.floor(this.distance * 100) / 100, coins: this.coins };
  }

  // ------------------------------------------------------------------
  frame = (ts) => {
    const dt = Math.min(0.05, Math.max(0, (ts - this.lastTs) / 1000));
    this.lastTs = ts;
    this.clock += dt;
    if (this.state === 'running') {
      this.update(dt);
    } else if (this.state === 'idle') {
      this.distance += IDLE_SPEED * dt;
      this.player.phase += dt * 10;
    }
    if (this.colors) this.renderer.draw(this, dt);
    requestAnimationFrame(this.frame);
  };

  update(dt) {
    const p = this.player;
    const speed = speedAt(this.distance);
    const step = speed * dt;
    this.distance += step;
    p.phase += dt * (8 + speed * 0.35);

    // Generar pista por delante
    while (this.genEnd < this.distance + VIEW_AHEAD) {
      const chunk = this.gen.nextChunk();
      for (const it of chunk.items) this.objects.push(it);
      this.genEnd = chunk.end;
    }

    // Movimiento lateral suave hacia el carril objetivo
    p.x += (p.lane * LW - p.x) * Math.min(1, dt * 16);

    // Salto / caída
    if (p.y > 0 || p.vy > 0) {
      const g = GAME.GRAVITY * (p.fastFall ? 2.4 : 1);
      p.vy -= g * dt;
      p.y += p.vy * dt;
      if (p.y <= 0) {
        p.y = 0;
        p.vy = 0;
        p.fastFall = false;
        if (p.queuedRoll) {
          p.queuedRoll = false;
          p.rollT = ROLL_TIME;
        }
      }
    }
    if (p.rollT > 0) p.rollT -= dt;

    // Temporizadores
    this.magnetT = Math.max(0, this.magnetT - dt);
    this.shieldT = Math.max(0, this.shieldT - dt);
    this.invulnT = Math.max(0, this.invulnT - dt);

    this.checkCollisions(step);

    // Limpieza de objetos que quedaron atrás
    if (++this.frameCount % 30 === 0) {
      const d = this.distance;
      this.objects = this.objects.filter((o) => !o.gone && o.z + (OBSTACLE_DEPTH[o.kind] || 0) > d - 12);
    }
    this.hooks.onTick?.(this);
  }

  overlapsLane(lane, frac) {
    return Math.abs(this.player.x - lane * LW) < LW * frac;
  }

  checkCollisions(step) {
    const p = this.player;
    const d = this.distance;
    const height = p.rollT > 0 ? ROLL_H : STAND_H;

    for (const o of this.objects) {
      if (o.gone) continue;
      const rel = o.z - d;
      if (rel < -12 || rel > GAME.MAGNET_RANGE + 2) continue;

      if (o.kind === 'coin') {
        if (this.magnetT > 0 && rel > -1 && rel < GAME.MAGNET_RANGE) {
          this.collectCoin(o, rel);
        } else if (Math.abs(rel) < 0.8 && this.overlapsLane(o.lane, 0.6) &&
          o.y >= p.y - 0.4 && o.y <= p.y + height + 0.4) {
          this.collectCoin(o, rel);
        }
        continue;
      }

      if (o.kind === 'magnet' || o.kind === 'shield') {
        if (Math.abs(rel) < 0.9 && this.overlapsLane(o.lane, 0.6) && o.y <= p.y + height + 0.5) {
          o.gone = true;
          const dur = this.durations[o.kind];
          if (o.kind === 'magnet') this.magnetT = dur;
          else this.shieldT = dur;
          const sp = this.renderer.proj(o.lane * LW, o.y, rel);
          this.renderer.spawnSparkles(sp.x, sp.y, o.kind === 'magnet' ? '#ff4d6d' : '#22d3ee', 14);
          this.hooks.onPowerup?.(o.kind);
        }
        continue;
      }

      // ---- Obstáculos ----
      const depth = OBSTACLE_DEPTH[o.kind];
      if (d + PLAYER_HALF <= o.z || d - PLAYER_HALF >= o.z + depth) continue;
      if (!this.overlapsLane(o.lane, 0.5)) continue;

      let hit;
      if (o.kind === 'barrier') hit = p.y < 1.0;      // hay que saltarla
      else if (o.kind === 'bar') hit = p.rollT <= 0;  // hay que rodar
      else hit = true;                                // vehículo: cambiar de carril
      if (!hit || this.invulnT > 0) continue;

      // Choque LATERAL contra un vehículo (te metiste en su carril cuando ya
      // estaba al lado): rebotás a tu carril en vez de morir, como en los runners top.
      const penetration = d + PLAYER_HALF - o.z;
      const isVehicle = o.kind === 'van' || o.kind === 'truck';
      if (isVehicle && penetration > step + 0.35 && p.prevLane !== o.lane) {
        p.lane = p.prevLane;
        this.invulnT = 0.25;
        this.renderer.shake = 0.2;
        this.hooks.onStumble?.();
        continue;
      }

      if (this.shieldT > 0) {
        this.shieldT = 0;
        this.invulnT = 1;
        o.gone = true;
        const sp = this.renderer.proj(o.lane * LW, 1, Math.max(rel, 0.5));
        this.renderer.spawnSparkles(sp.x, sp.y, '#22d3ee', 20);
        this.renderer.shake = 0.25;
        this.hooks.onShieldBreak?.();
        continue;
      }

      this.state = 'crashed';
      this.renderer.shake = 0.5;
      this.hooks.onCrash?.();
      return;
    }
  }

  collectCoin(o, rel) {
    o.gone = true;
    this.coins++;
    const sp = this.renderer.proj(o.lane * LW, o.y, Math.max(rel, 0));
    this.renderer.spawnSparkles(sp.x, sp.y, '#ffd23f', 5);
    this.hooks.onCoin?.(this.coins);
  }

  onInput(dir) {
    if (this.state !== 'running') return;
    const p = this.player;
    switch (dir) {
      case 'left':
        if (p.lane > -1) {
          p.prevLane = p.lane;
          p.lane--;
          this.hooks.onMove?.();
        }
        break;
      case 'right':
        if (p.lane < 1) {
          p.prevLane = p.lane;
          p.lane++;
          this.hooks.onMove?.();
        }
        break;
      case 'up':
        if (p.y <= 0 && p.vy <= 0) {
          p.vy = GAME.JUMP_VELOCITY;
          p.y = 0.001;
          p.rollT = 0;
          this.hooks.onJump?.();
        }
        break;
      case 'down':
        if (p.y > 0) {
          // En el aire: caída rápida y rueda al aterrizar
          p.fastFall = true;
          p.vy = Math.min(p.vy, -4);
          p.queuedRoll = true;
        } else {
          p.rollT = ROLL_TIME;
        }
        this.hooks.onRoll?.();
        break;
      default:
        break;
    }
  }
}
