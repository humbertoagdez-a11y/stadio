// =====================================================================
// Punto de entrada del servidor.
// =====================================================================
import 'dotenv/config';
import { loadConfig } from './config.js';
import { openDatabase } from './db.js';
import { createApp } from './app.js';

let config;
try {
  config = loadConfig(process.env);
} catch (err) {
  console.error('[config]', err.message);
  process.exit(1);
}
for (const w of config.warnings) console.warn('[config] ⚠️ ', w);

const db = openDatabase(config.dbPath);
const app = createApp({ config, db });

const server = app.listen(config.port, config.host, () => {
  console.log(`[server] Escuchando en http://${config.host}:${config.port} ` +
    `(ads=${config.ads.provider}, devAuth=${config.devAuth}, prod=${config.isProd})`);
});

// Cierre ordenado (PM2 / Docker envían SIGINT / SIGTERM).
function shutdown(signal) {
  console.log(`[server] ${signal} recibido, cerrando...`);
  server.close(() => {
    db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 8000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
