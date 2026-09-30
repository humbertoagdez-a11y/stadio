// =====================================================================
// Configuración leída de variables de entorno (.env).
// Falla rápido en producción si falta algo crítico.
// =====================================================================
function bool(v, def = false) {
  if (v === undefined || v === '') return def;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
}
function int(v, def) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
}

/**
 * Construye la configuración desde un objeto de entorno.
 * Lanza Error si falta algo crítico (index.js lo captura y corta el arranque).
 */
export function loadConfig(env = process.env) {
  const isProd = env.NODE_ENV === 'production';
  const config = {
    isProd,
    port: int(env.PORT, 3000),
    host: env.HOST || '127.0.0.1',
    dbPath: env.DB_PATH || './data/game.sqlite',

    // Token del bot (BotFather). Se usa para validar la firma de initData.
    botToken: env.BOT_TOKEN || '',
    // Antigüedad máxima aceptada de initData (seg). 24h por defecto.
    initDataMaxAge: int(env.INITDATA_MAX_AGE, 86400),

    // Modo desarrollo: permite jugar fuera de Telegram con un usuario falso.
    // NUNCA se habilita en producción (se fuerza a false abajo).
    devAuth: !isProd && bool(env.DEV_AUTH, false),

    ads: {
      // 'adsgram' (real) o 'mock' (anuncio simulado para desarrollo).
      provider: env.ADS_PROVIDER || 'mock',
      adsgramBlockId: env.ADSGRAM_BLOCK_ID || '',
      adsgramDebug: bool(env.ADSGRAM_DEBUG, false),
      // Secreto que va en la "Reward URL" configurada en el panel de Adsgram.
      // Si está definido, sólo se da la recompensa cuando Adsgram confirma
      // server-to-server que el anuncio se vio completo (recomendado).
      rewardSecret: env.ADSGRAM_REWARD_SECRET || '',
      // Máximo de anuncios recompensados por usuario por día (anti-abuso).
      dailyCap: int(env.ADS_DAILY_CAP, 80),
      // Segundos mínimos entre pedir un anuncio y reclamar la recompensa.
      minWatchSeconds: int(env.ADS_MIN_WATCH_SECONDS, 4),
    },

    // Dominio público (sólo informativo / logs).
    publicUrl: env.PUBLIC_URL || '',
  };

  // ---- Validaciones de arranque ----
  const errors = [];
  if (isProd && !config.botToken) errors.push('BOT_TOKEN es obligatorio en producción.');
  if (!['adsgram', 'mock'].includes(config.ads.provider)) errors.push('ADS_PROVIDER debe ser "adsgram" o "mock".');
  if (isProd && config.ads.provider === 'mock') errors.push('ADS_PROVIDER=mock no está permitido en producción.');
  if (config.ads.provider === 'adsgram' && !config.ads.adsgramBlockId) errors.push('Falta ADSGRAM_BLOCK_ID.');
  if (errors.length) throw new Error('Errores de configuración:\n - ' + errors.join('\n - '));

  config.warnings = [];
  if (config.ads.provider === 'adsgram' && !config.ads.rewardSecret) {
    config.warnings.push('ADSGRAM_REWARD_SECRET vacío: las recompensas se darán confiando en el cliente. ' +
      'Configurá la Reward URL en Adsgram para validación server-to-server.');
  }
  if (!config.botToken) config.warnings.push('BOT_TOKEN vacío: sólo funcionará el modo DEV_AUTH.');
  return config;
}
