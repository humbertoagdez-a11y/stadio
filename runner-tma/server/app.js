// =====================================================================
// Construcción de la app Express (separada de index.js para poder testearla).
// =====================================================================
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createApiRouter } from './routes/api.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function createApp({ config, db }) {
  const app = express();
  app.disable('x-powered-by');
  // Detrás de Nginx: confiar en X-Forwarded-For del primer proxy (IP real para rate-limit).
  app.set('trust proxy', 1);

  app.use(helmet({
    // Telegram Web / Desktop cargan la Mini App dentro de un iframe:
    // X-Frame-Options bloquearía el juego, así que se desactiva.
    frameguard: false,
    // La CSP por defecto bloquearía el SDK de Telegram y el de Adsgram (que carga
    // creatividades desde dominios variables). Se deja desactivada a propósito.
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
  app.use(compression());
  app.use(express.json({ limit: '16kb' }));

  // Límite por IP para toda la API (defensa básica contra spam/bots).
  app.use('/api', rateLimit({
    windowMs: 60_000,
    limit: 240,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  }));
  app.use('/api', createApiRouter({ config, db }));
  app.use('/api', (req, res) => res.status(404).json({ error: 'not_found' }));

  // Archivos estáticos. "no-cache" = el WebView de Telegram revalida con ETag
  // y siempre recibe la última versión después de un deploy.
  const staticOpts = {
    etag: true,
    setHeaders: (res) => res.setHeader('Cache-Control', 'no-cache'),
  };
  app.use('/shared', express.static(path.join(ROOT, 'shared'), staticOpts));
  app.use(express.static(path.join(ROOT, 'public'), staticOpts));

  app.get('/healthz', (req, res) => res.json({ ok: true }));
  return app;
}
