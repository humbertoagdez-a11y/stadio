// =====================================================================
// Rewarded Ads.
//  - provider "adsgram": SDK oficial de Adsgram (https://docs.adsgram.ai)
//  - provider "mock"   : anuncio simulado de 5 s para desarrollo
//
// Flujo (el servidor decide si se entrega el premio, nunca el cliente):
//   api.requestAd()  ->  mostrar anuncio  ->  api.claimAd()
// =====================================================================
import { api } from './api.js';

const ADSGRAM_SDK = 'https://sad.adsgram.ai/js/sad.min.js';
let cfg = { provider: 'mock' };
let sdkPromise = null;
let controller = null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function initAds(adsConfig) {
  cfg = adsConfig || cfg;
  if (cfg.provider === 'adsgram') loadAdsgramSdk().catch(() => {}); // precarga
}

function loadAdsgramSdk() {
  if (window.Adsgram) return Promise.resolve();
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = ADSGRAM_SDK;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      sdkPromise = null; // permitir reintento
      reject(new Error('sdk_load_failed'));
    };
    document.head.appendChild(s);
  });
  return sdkPromise;
}

/** Reproduce el anuncio. Devuelve true sólo si se vio COMPLETO. */
async function playAd() {
  if (cfg.provider === 'mock') return showMockAd();

  await loadAdsgramSdk();
  if (!window.Adsgram) throw new Error('sdk_unavailable');
  if (!controller) controller = window.Adsgram.init({ blockId: String(cfg.blockId), debug: !!cfg.debug });
  try {
    // En bloques "Reward", show() resuelve cuando el usuario vio el anuncio
    // hasta el final y rechaza si lo saltea o si hubo error / no hay anuncios.
    const result = await controller.show();
    return result?.done === true;
  } catch (err) {
    console.warn('[ads] no completado', err);
    return false;
  }
}

/**
 * Flujo completo de anuncio recompensado.
 * @param {'multiplier'|'revive'} type
 * @returns {Promise<{ok:true, ...}|{ok:false, reason:string}>}
 */
export async function watchRewardedAd(type, runId) {
  const { adId } = await api.requestAd(type, runId); // puede lanzar (tope diario, cooldown...)
  let watched = false;
  try {
    watched = await playAd();
  } catch (err) {
    return { ok: false, reason: err.message || 'ad_error' };
  }
  if (!watched) return { ok: false, reason: 'not_completed' };

  // Reclamo con reintentos: el callback S2S de Adsgram puede demorar.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await api.claimAd(adId);
    } catch (err) {
      const retryable = err.code === 'not_verified' || err.code === 'too_soon' || err.code === 'network_error';
      if (!retryable || attempt === 2) throw err;
      await sleep(1500);
    }
  }
  return { ok: false, reason: 'claim_failed' };
}

// ---------------------------------------------------------------------
// Anuncio simulado (sólo desarrollo). Permite probar todo el flujo sin
// cuenta de Adsgram. El servidor lo rechaza en producción.
// ---------------------------------------------------------------------
function showMockAd() {
  return new Promise((resolve) => {
    const el = document.getElementById('overlay-ad');
    const timer = el.querySelector('#ad-timer');
    const close = el.querySelector('#ad-close');
    const skip = el.querySelector('#ad-skip');
    let left = 5;
    el.classList.remove('hidden');
    close.disabled = true;
    close.textContent = `Recompensa en ${left}s`;
    timer.textContent = left;
    const iv = setInterval(() => {
      left--;
      timer.textContent = Math.max(left, 0);
      if (left > 0) {
        close.textContent = `Recompensa en ${left}s`;
      } else {
        clearInterval(iv);
        close.disabled = false;
        close.textContent = '✓ Cerrar y cobrar';
      }
    }, 1000);
    const done = (ok) => {
      clearInterval(iv);
      el.classList.add('hidden');
      close.onclick = null;
      skip.onclick = null;
      resolve(ok);
    };
    close.onclick = () => done(true);
    skip.onclick = () => done(false);
  });
}
