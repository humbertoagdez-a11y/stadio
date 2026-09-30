// =====================================================================
// Orquestador: arranque, flujo de partida, anuncios, tienda y ranking.
// =====================================================================
import {
  initTelegram, getInitData, haptic, showBackButton, setClosingConfirmation, onTelegramEvent,
} from './telegram.js';
import { api, setAuth } from './api.js';
import { initAds, watchRewardedAd } from './ads.js';
import { RunnerGame } from './game/engine.js';
import { sfx, unlockAudio, toggleMute, isMuted } from './audio.js';
import * as ui from './ui.js';

const RING_LEN = 276.46; // 2·π·44 (circunferencia del anillo SVG)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Estado global de la app
const S = {
  cfg: null,          // /api/config
  me: null,           // perfil del jugador (fuente: servidor)
  run: null,          // partida en curso
  selected: new Set(),// boosts elegidos para la próxima partida
  shopTab: 'skins',
  durations: { magnet: 8, shield: 6 },
  busy: false,
  ending: false,
  revive: null,       // estado de la cuenta regresiva de revivir
  hideBack: null,
};
let game;

// ---------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------
async function boot() {
  initTelegram();
  try {
    S.cfg = await api.config();
  } catch {
    ui.showScreen('screen-blocked');
    ui.toast('No se pudo conectar con el servidor');
    return;
  }

  let initData = getInitData();
  if (!initData) {
    // Fuera de Telegram: sólo se permite en desarrollo (DEV_AUTH=true en el servidor).
    if (!S.cfg.devAuth) {
      ui.showScreen('screen-blocked');
      return;
    }
    initData = `dev:${devUserId()}`;
  }
  setAuth(initData);
  initAds(S.cfg.ads);

  game = new RunnerGame(ui.$('game'), hooks);
  try {
    S.me = await api.me();
  } catch (err) {
    ui.showScreen('screen-blocked');
    ui.toast(ui.errorMessage(err), 5000);
    return;
  }
  game.setColors(skinColors(S.me.equippedSkin));
  game.idle();
  bindUi();
  goMenu();
}

function devUserId() {
  const fromUrl = new URLSearchParams(location.search).get('uid');
  if (fromUrl) return fromUrl;
  try {
    let id = localStorage.getItem('devUid');
    if (!id) {
      id = String(100000 + Math.floor(Math.random() * 900000));
      localStorage.setItem('devUid', id);
    }
    return id;
  } catch {
    return '777';
  }
}

function skinColors(id) {
  const skins = S.cfg.catalog.skins;
  return (skins.find((s) => s.id === id) || skins[0]).colors;
}

function durationsFor(upgrades) {
  return Object.fromEntries(S.cfg.catalog.upgrades.map((u) => [u.id, u.durations[upgrades[u.id] || 0]]));
}

// ---------------------------------------------------------------------
// Eventos del motor
// ---------------------------------------------------------------------
const hooks = {
  onCoin: (n) => { ui.setHudCoins(n); sfx.coin(); },
  onMove: () => { sfx.move(); haptic.select(); },
  onJump: () => sfx.jump(),
  onRoll: () => sfx.roll(),
  onStumble: () => haptic.medium(),
  onShieldBreak: () => { haptic.heavy(); ui.toast('🛡️ ¡El escudo te salvó!', 1000); },
  onPowerup: (kind) => {
    sfx.power();
    haptic.success();
    ui.toast(kind === 'magnet' ? '🧲 ¡Imán activado!' : '🛡️ ¡Escudo activado!', 1000);
  },
  onCrash: () => {
    sfx.crash();
    haptic.error();
    onCrash();
  },
  onTick: (g) => ui.updateHud(g, S.durations),
};

// ---------------------------------------------------------------------
// Navegación
// ---------------------------------------------------------------------
function clearBack() {
  if (S.hideBack) S.hideBack();
  S.hideBack = null;
}

function goMenu() {
  clearBack();
  ['overlay-gameover', 'overlay-pause', 'overlay-revive', 'hud'].forEach(ui.hide);
  if (game.state !== 'idle') game.idle();
  game.setColors(skinColors(S.me.equippedSkin));
  renderMenu();
  ui.showScreen('screen-menu');
}

function renderMenu() {
  ui.renderMenu(S.me, S.cfg.catalog, S.selected, (id) => {
    if (S.selected.has(id)) S.selected.delete(id);
    else if ((S.me.consumables[id] || 0) > 0) S.selected.add(id);
    haptic.select();
    renderMenu();
  });
}

function openShop() {
  ui.showScreen('screen-shop');
  renderShop();
  clearBack();
  S.hideBack = showBackButton(goMenu);
}

function renderShop() {
  ui.renderShop(S.me, S.cfg.catalog, S.shopTab, { onBuy: buy, onEquip: equip });
}

async function openRanking() {
  ui.showScreen('screen-ranking');
  clearBack();
  S.hideBack = showBackButton(goMenu);
  ui.$('ranking-list').innerHTML = '<div class="spinner" style="margin:40px auto"></div>';
  ui.$('ranking-me').textContent = '';
  try {
    ui.renderRanking(await api.leaderboard());
  } catch (err) {
    ui.$('ranking-list').innerHTML = '';
    ui.toast(ui.errorMessage(err));
  }
}

// ---------------------------------------------------------------------
// Partida
// ---------------------------------------------------------------------
async function startRun() {
  if (S.busy) return;
  S.busy = true;
  ui.$('btn-play').disabled = true;
  ui.$('btn-again').disabled = true;
  try {
    const run = await api.startRun([...S.selected]);
    S.selected.clear();
    S.run = { ...run, revivesUsed: 0 };
    S.durations = durationsFor(run.upgrades);
    for (const it of run.items) S.me.consumables[it] = Math.max(0, (S.me.consumables[it] || 0) - 1);
    S.me.pendingMultiplier = false;

    clearBack();
    ['overlay-gameover', 'overlay-pause', 'overlay-revive'].forEach(ui.hide);
    ui.showScreen(null);
    ui.show('hud');
    ui.resetHud(run.multiplier);
    game.start({ seed: run.seed, colors: skinColors(run.skin), durations: S.durations, items: run.items });
    setClosingConfirmation(true);
  } catch (err) {
    ui.toast(ui.errorMessage(err));
  } finally {
    S.busy = false;
    ui.$('btn-play').disabled = false;
    ui.$('btn-again').disabled = false;
  }
}

function pauseGame() {
  if (game?.state !== 'running') return;
  game.pause();
  ui.show('overlay-pause');
}

function resumeGame() {
  ui.hide('overlay-pause');
  game.resume();
}

// ---- Revive Ad: pantalla de 5 s al chocar ----
function onCrash() {
  const left = S.run.maxRevives - S.run.revivesUsed;
  if (left <= 0) {
    setTimeout(endRun, 700);
    return;
  }
  ui.$('revive-left').textContent = `Mirando un anuncio · ${left} ${left === 1 ? 'restante' : 'restantes'}`;
  ui.show('overlay-revive');
  startReviveCountdown(S.cfg.game.reviveWindowSec * 1000);
}

function startReviveCountdown(ms) {
  stopReviveCountdown();
  const total = S.cfg.game.reviveWindowSec * 1000;
  const end = performance.now() + ms;
  const ring = ui.$('revive-ring');
  S.revive = { remaining: ms, raf: 0 };
  const tick = () => {
    if (!S.revive) return;
    const rem = Math.max(0, end - performance.now());
    S.revive.remaining = rem;
    ring.style.strokeDashoffset = String(RING_LEN * (1 - rem / total));
    ui.$('revive-count').textContent = String(Math.ceil(rem / 1000));
    if (rem <= 0) {
      S.revive = null;
      endRun();
      return;
    }
    S.revive.raf = requestAnimationFrame(tick);
  };
  tick();
}

function stopReviveCountdown() {
  if (S.revive) cancelAnimationFrame(S.revive.raf);
}

async function doRevive() {
  if (S.busy || !S.run) return;
  S.busy = true;
  stopReviveCountdown(); // la cuenta se congela mientras se ve el anuncio
  const remaining = S.revive?.remaining ?? 2500;
  const btn = ui.$('btn-revive');
  btn.disabled = true;
  btn.textContent = 'Cargando anuncio…';
  try {
    const res = await watchRewardedAd('revive', S.run.runId);
    if (res.ok) {
      S.revive = null;
      S.run.revivesUsed = res.revivesUsed;
      ui.hide('overlay-revive');
      haptic.success();
      game.revive();
      return;
    }
    ui.toast(ui.errorMessage(res));
  } catch (err) {
    ui.toast(ui.errorMessage(err));
    if (['max_revives', 'run_not_active', 'daily_cap', 'revive_not_allowed'].includes(err.code)) {
      S.revive = null;
      S.busy = false;
      endRun();
      return;
    }
  } finally {
    S.busy = false;
    btn.disabled = false;
    btn.textContent = '▶ Continuar desde acá';
  }
  // Anuncio no completado: se retoma la cuenta regresiva (mínimo 2,5 s).
  startReviveCountdown(Math.max(remaining, 2500));
}

async function endRun() {
  if (S.ending || !S.run) return;
  S.ending = true;
  stopReviveCountdown();
  S.revive = null;
  ui.hide('overlay-revive');
  ui.hide('overlay-pause');
  game.finish();
  setClosingConfirmation(false);

  const result = game.getResult();
  const run = S.run;
  S.run = null;

  // Enviar resultado (con reintentos si falla la red)
  let res = null;
  for (let i = 0; i < 3 && !res; i++) {
    try {
      res = await api.finishRun(run.runId, result);
    } catch (err) {
      if (err.status >= 400 && err.status < 500) break; // error definitivo
      await sleep(1000 * (i + 1));
    }
  }

  ui.hide('hud');
  if (res) {
    S.me.coins = res.coinsBalance;
    S.me.bestScore = res.bestScore;
    ui.$('go-score').textContent = `${ui.fmt(res.score)} m`;
    ui.$('go-coins').textContent = `+${ui.fmt(res.coinsAwarded)}`;
    ui.$('go-newbest').classList.toggle('hidden', !res.newBest);
    ui.$('go-detail').textContent = res.multiplier > 1
      ? `${res.coinsCollected} monedas × 2 gracias al anuncio 🎉`
      : res.coinsCollected > 0
        ? `Con x2 hubieras ganado ${ui.fmt(res.coinsCollected * 2)} 👀`
        : '';
    if (res.newBest) haptic.success();
  } else {
    ui.$('go-score').textContent = `${ui.fmt(result.distance)} m`;
    ui.$('go-coins').textContent = '—';
    ui.$('go-newbest').classList.add('hidden');
    ui.$('go-detail').textContent = 'No se pudo guardar la partida (sin conexión).';
  }
  renderMenu(); // refresca visibilidad del botón x2
  ui.show('overlay-gameover');
  S.ending = false;
}

// ---- Multiplier Ad: x2 monedas para la próxima partida ----
async function watchMultiplier(btn) {
  if (S.busy) return;
  S.busy = true;
  btn.disabled = true;
  try {
    const res = await watchRewardedAd('multiplier');
    if (res.ok) {
      S.me = res.profile;
      sfx.power();
      haptic.success();
      ui.toast('¡x2 activado para tu próxima partida!');
      renderMenu();
      if (!ui.$('screen-shop').classList.contains('hidden')) renderShop();
    } else {
      ui.toast(ui.errorMessage(res));
    }
  } catch (err) {
    ui.toast(ui.errorMessage(err));
  } finally {
    S.busy = false;
    btn.disabled = false;
  }
}

// ---------------------------------------------------------------------
// Tienda
// ---------------------------------------------------------------------
async function buy(itemId) {
  if (S.busy) return;
  S.busy = true;
  try {
    const res = await api.buy(itemId);
    S.me = res.profile;
    sfx.buy();
    haptic.success();
    ui.toast('¡Comprado!');
    if (itemId.startsWith('skin:')) await equip(itemId.slice(5), true);
  } catch (err) {
    haptic.error();
    ui.toast(ui.errorMessage(err));
  } finally {
    S.busy = false;
    renderShop();
  }
}

async function equip(skinId, silent = false) {
  try {
    const res = await api.equip(skinId);
    S.me = res.profile;
    game.setColors(skinColors(S.me.equippedSkin));
    if (!silent) haptic.select();
  } catch (err) {
    ui.toast(ui.errorMessage(err));
  }
  renderShop();
}

// ---------------------------------------------------------------------
// Bindings
// ---------------------------------------------------------------------
function bindUi() {
  const on = (id, fn) => ui.$(id).addEventListener('click', fn);

  on('btn-play', startRun);
  on('btn-again', startRun);
  on('btn-menu', goMenu);
  on('btn-shop', openShop);
  on('btn-ranking', openRanking);
  on('btn-mult', (e) => watchMultiplier(e.currentTarget));
  on('go-mult', (e) => watchMultiplier(e.currentTarget));
  on('shop-earn', (e) => watchMultiplier(e.currentTarget));
  on('btn-pause', pauseGame);
  on('btn-resume', resumeGame);
  on('btn-quit', endRun);
  on('btn-revive', doRevive);
  on('btn-giveup', endRun);

  const muteBtn = ui.$('btn-mute');
  muteBtn.textContent = isMuted() ? '🔇' : '🔊';
  muteBtn.addEventListener('click', () => {
    muteBtn.textContent = toggleMute() ? '🔇' : '🔊';
  });

  document.querySelectorAll('[data-back]').forEach((b) => b.addEventListener('click', goMenu));
  document.querySelectorAll('#screen-shop .tab').forEach((t) => t.addEventListener('click', () => {
    S.shopTab = t.dataset.tab;
    haptic.select();
    renderShop();
  }));

  // El audio sólo puede iniciarse tras un gesto del usuario.
  window.addEventListener('pointerdown', unlockAudio, { once: true });

  // Pausa automática si la app pasa a segundo plano.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseGame();
  });
  onTelegramEvent('deactivated', pauseGame);
}

boot();
