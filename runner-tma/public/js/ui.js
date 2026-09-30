// =====================================================================
// Capa de UI (DOM): pantallas, tienda, ranking, HUD y toasts.
// =====================================================================
import { drawThief } from './game/renderer.js';

export const $ = (id) => document.getElementById(id);

const SCREENS = ['screen-loading', 'screen-blocked', 'screen-menu', 'screen-shop', 'screen-ranking'];

export function showScreen(id) {
  for (const s of SCREENS) $(s).classList.toggle('hidden', s !== id);
}
export function show(id) { $(id).classList.remove('hidden'); }
export function hide(id) { $(id).classList.add('hidden'); }

let toastTimer = null;
export function toast(msg, ms = 2200) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

const ERRORS = {
  not_enough_coins: 'No te alcanzan las monedas',
  already_owned: 'Ya lo tenés',
  max_level: 'Ya está al nivel máximo',
  max_stack: 'Llegaste al máximo',
  daily_cap: 'Llegaste al límite diario de anuncios. ¡Volvé mañana!',
  ad_cooldown: 'Esperá unos segundos',
  multiplier_already_active: 'Ya tenés x2 activado',
  max_revives: 'No quedan reactivaciones',
  run_not_active: 'La partida ya terminó',
  not_verified: 'No pudimos verificar el anuncio',
  not_completed: 'Tenés que ver el anuncio completo',
  sdk_load_failed: 'No se pudieron cargar los anuncios',
  sdk_unavailable: 'Anuncios no disponibles ahora',
  network_error: 'Sin conexión. Probá de nuevo',
  too_fast: 'Esperá un segundo',
  unauthorized: 'Sesión vencida. Cerrá y abrí el juego de nuevo',
};
export function errorMessage(err) {
  const code = err?.code || err?.reason || err?.message;
  return ERRORS[code] || 'Algo salió mal. Probá de nuevo';
}

export function fmt(n) {
  return Math.floor(n).toLocaleString('es');
}

// ---------------- Menú ----------------
export function renderMenu(me, catalog, selectedItems, onToggleItem) {
  $('menu-coins').textContent = fmt(me.coins);
  $('menu-best').textContent = fmt(me.bestScore);
  $('btn-mult').classList.toggle('hidden', me.pendingMultiplier);
  $('mult-active').classList.toggle('hidden', !me.pendingMultiplier);
  $('go-mult').classList.toggle('hidden', me.pendingMultiplier);

  // Boosts (consumibles) que se pueden activar antes de jugar
  const box = $('boosts');
  box.innerHTML = '';
  for (const c of catalog.consumables) {
    const qty = me.consumables[c.id] || 0;
    const b = document.createElement('button');
    b.className = 'boost' + (selectedItems.has(c.id) ? ' on' : '');
    b.disabled = qty === 0;
    b.innerHTML = `<span>${c.icon}</span><span>${c.name.replace('Arranque con ', '')} ×${qty}</span>`;
    b.onclick = () => onToggleItem(c.id);
    box.appendChild(b);
  }
}

// ---------------- Tienda ----------------
function priceHtml(p) {
  return `<span class="price"><span class="coin-ico"></span>${fmt(p)}</span>`;
}

function skinPreview(colors) {
  const cv = document.createElement('canvas');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = 56 * dpr;
  cv.height = 64 * dpr;
  const ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr);
  drawThief(ctx, 28, 58, 26, colors, 0.6, 'run');
  return cv;
}

export function renderShop(me, catalog, tab, { onBuy, onEquip }) {
  $('shop-coins').textContent = fmt(me.coins);
  document.querySelectorAll('#screen-shop .tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === tab));
  const list = $('shop-list');
  list.innerHTML = '';

  const row = (visual, title, subtitle, button) => {
    const el = document.createElement('div');
    el.className = 'item';
    el.appendChild(visual);
    const info = document.createElement('div');
    info.className = 'info';
    info.innerHTML = `<b>${title}</b><small>${subtitle}</small>`;
    el.appendChild(info);
    el.appendChild(button);
    list.appendChild(el);
    return info;
  };
  const icon = (emoji) => {
    const d = document.createElement('div');
    d.className = 'big-ico';
    d.textContent = emoji;
    return d;
  };
  const btn = (html, cls, onClick, disabled = false) => {
    const b = document.createElement('button');
    b.className = `btn small ${cls}`;
    b.innerHTML = html;
    b.disabled = disabled;
    b.onclick = onClick;
    return b;
  };

  if (tab === 'skins') {
    for (const s of catalog.skins) {
      const owned = me.skins.includes(s.id);
      const equipped = me.equippedSkin === s.id;
      let b;
      if (equipped) b = btn('Usando', 'equipped', null, true);
      else if (owned) b = btn('Usar', '', () => onEquip(s.id));
      else b = btn(priceHtml(s.price), 'buy', () => onBuy(`skin:${s.id}`), me.coins < s.price);
      row(skinPreview(s.colors), s.name, owned ? 'En tu colección' : 'Personaje', b);
    }
  } else if (tab === 'upgrades') {
    for (const u of catalog.upgrades) {
      const lvl = me.upgrades[u.id] || 0;
      const maxed = lvl >= u.prices.length;
      const next = maxed ? '' : ` → ${u.durations[lvl + 1]}s`;
      const b = maxed
        ? btn('MAX', 'equipped', null, true)
        : btn(priceHtml(u.prices[lvl]), 'buy', () => onBuy(`upgrade:${u.id}`), me.coins < u.prices[lvl]);
      const info = row(icon(u.icon), u.name, `Duración ${u.durations[lvl]}s${next}`, b);
      const lv = document.createElement('div');
      lv.className = 'levels';
      lv.innerHTML = u.prices.map((_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('');
      info.appendChild(lv);
    }
  } else {
    for (const c of catalog.consumables) {
      const qty = me.consumables[c.id] || 0;
      const b = btn(priceHtml(c.price), 'buy', () => onBuy(`consumable:${c.id}`), me.coins < c.price || qty >= c.maxStack);
      row(icon(c.icon), c.name, `Tenés ${qty} · se activa al empezar`, b);
    }
  }
}

// ---------------- Ranking ----------------
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

export function renderRanking(data) {
  const list = $('ranking-list');
  if (!data.top.length) {
    list.innerHTML = '<p class="muted" style="text-align:center">Todavía no hay récords. ¡Sé el primero!</p>';
  } else {
    list.innerHTML = data.top.map((r) => `
      <div class="rank-row${r.isMe ? ' me' : ''}">
        <span class="pos">#${r.rank}</span>
        <span class="name">${escapeHtml(r.name)}</span>
        <b>${fmt(r.score)} m</b>
      </div>`).join('');
  }
  $('ranking-me').textContent = data.me.rank
    ? `Tu posición: #${data.me.rank} · ${fmt(data.me.score)} m`
    : 'Jugá una partida para entrar al ranking';
}

// ---------------- HUD ----------------
let lastScore = -1;
export function resetHud(multiplier) {
  lastScore = -1;
  $('hud-score').textContent = '0';
  $('hud-coins').textContent = '0';
  $('hud-mult').classList.toggle('hidden', multiplier < 2);
  $('hud-powerups').innerHTML = '';
}

export function updateHud(game, durations) {
  const score = Math.floor(game.distance);
  if (score !== lastScore) {
    lastScore = score;
    $('hud-score').textContent = score;
  }
  // Barras de power-ups activos (se redibujan pocas veces por segundo)
  if (game.frameCount % 6 !== 0) return;
  const bars = [];
  if (game.magnetT > 0) bars.push(['🧲', game.magnetT / durations.magnet]);
  if (game.shieldT > 0) bars.push(['🛡️', game.shieldT / durations.shield]);
  $('hud-powerups').innerHTML = bars
    .map(([ico, f]) => `<div class="pu"><span>${ico}</span><div class="pu-bar"><i style="width:${Math.min(100, f * 100)}%"></i></div></div>`)
    .join('');
}

export function setHudCoins(n) {
  $('hud-coins').textContent = n;
}
