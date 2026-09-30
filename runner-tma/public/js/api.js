// =====================================================================
// Cliente HTTP de la API. Cada request lleva el initData firmado por
// Telegram en el header Authorization; el servidor lo valida siempre.
// =====================================================================
let authHeader = '';

export function setAuth(initData) {
  authHeader = `tma ${initData}`;
}

export class ApiError extends Error {
  constructor(status, code, data) {
    super(code || `http_${status}`);
    this.status = status;
    this.code = code || `http_${status}`;
    this.data = data;
  }
}

async function request(method, path, body) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'network_error');
  }
  let data = null;
  try {
    data = await res.json();
  } catch { /* respuesta sin JSON */ }
  if (!res.ok) throw new ApiError(res.status, data?.error, data);
  return data;
}

export const api = {
  config: () => request('GET', '/config'),
  me: () => request('GET', '/me'),
  startRun: (items) => request('POST', '/runs/start', { items }),
  finishRun: (runId, result) => request('POST', `/runs/${encodeURIComponent(runId)}/finish`, result),
  requestAd: (type, runId) => request('POST', '/ads/request', { type, runId }),
  claimAd: (adId) => request('POST', '/ads/claim', { adId }),
  buy: (itemId) => request('POST', '/shop/buy', { itemId }),
  equip: (skinId) => request('POST', '/shop/equip', { skinId }),
  leaderboard: () => request('GET', '/leaderboard'),
};
