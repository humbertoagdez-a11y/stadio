// =====================================================================
// Envoltorio de la API nativa window.Telegram.WebApp.
// Todas las llamadas chequean versión: los clientes viejos de Telegram
// tiran warnings/errores si llamás métodos que no soportan.
// =====================================================================
export const tg = window.Telegram?.WebApp || null;

const supports = (version) => !!tg && typeof tg.isVersionAtLeast === 'function' && tg.isVersionAtLeast(version);

export function initTelegram() {
  if (!tg) return;
  tg.ready();
  tg.expand();
  // CLAVE en un juego de swipes: evita que deslizar hacia abajo cierre la Mini App (Bot API 7.7+).
  if (supports('7.7')) tg.disableVerticalSwipes();
  if (supports('6.1')) {
    tg.setHeaderColor('#0b0f1f');
    tg.setBackgroundColor('#0b0f1f');
  }
  if (supports('7.10')) tg.setBottomBarColor('#0b0f1f');
  // Bloquear orientación vertical (Bot API 8.0+), si está disponible.
  if (supports('8.0') && typeof tg.lockOrientation === 'function') {
    try { tg.lockOrientation(); } catch { /* ignorar */ }
  }
}

/** initData firmado por Telegram (vacío si se abre fuera de Telegram). */
export function getInitData() {
  return tg?.initData || '';
}

export function getTelegramUser() {
  return tg?.initDataUnsafe?.user || null;
}

export const haptic = {
  light: () => supports('6.1') && tg.HapticFeedback.impactOccurred('light'),
  medium: () => supports('6.1') && tg.HapticFeedback.impactOccurred('medium'),
  heavy: () => supports('6.1') && tg.HapticFeedback.impactOccurred('heavy'),
  success: () => supports('6.1') && tg.HapticFeedback.notificationOccurred('success'),
  error: () => supports('6.1') && tg.HapticFeedback.notificationOccurred('error'),
  select: () => supports('6.1') && tg.HapticFeedback.selectionChanged(),
};

/** Muestra el botón "atrás" nativo de Telegram. Devuelve función para ocultarlo. */
export function showBackButton(handler) {
  if (!supports('6.1')) return () => {};
  tg.BackButton.onClick(handler);
  tg.BackButton.show();
  return () => {
    tg.BackButton.offClick(handler);
    tg.BackButton.hide();
  };
}

/** Pide confirmación antes de cerrar la app (útil durante una partida). */
export function setClosingConfirmation(enabled) {
  if (!supports('6.2')) return;
  if (enabled) tg.enableClosingConfirmation();
  else tg.disableClosingConfirmation();
}

/** Suscripción a eventos de Telegram (p. ej. 'deactivated' en Bot API 8.0). */
export function onTelegramEvent(name, handler) {
  if (tg?.onEvent) tg.onEvent(name, handler);
}
