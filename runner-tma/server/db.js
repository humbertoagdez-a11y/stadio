// =====================================================================
// Base de datos SQLite (better-sqlite3: síncrona y muy rápida).
// Para un juego de este tipo aguanta miles de usuarios activos sin
// problema en un VPS chico. Si algún día escala mucho, migrar a Postgres.
// =====================================================================
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

export function openDatabase(dbPath) {
  if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');   // lecturas concurrentes mientras se escribe
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  migrate(db);
  return db;
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id                 INTEGER PRIMARY KEY,          -- Telegram user id
      username           TEXT,
      first_name         TEXT,
      last_name          TEXT,
      language_code      TEXT,
      is_premium         INTEGER NOT NULL DEFAULT 0,
      coins              INTEGER NOT NULL DEFAULT 0,
      best_score         INTEGER NOT NULL DEFAULT 0,
      total_runs         INTEGER NOT NULL DEFAULT 0,
      equipped_skin      TEXT    NOT NULL DEFAULT 'classic',
      pending_multiplier INTEGER NOT NULL DEFAULT 0,   -- x2 ganado con anuncio, se usa en la próxima partida
      suspicious_count   INTEGER NOT NULL DEFAULT 0,   -- partidas marcadas por el anti-cheat
      banned             INTEGER NOT NULL DEFAULT 0,
      created_at         INTEGER NOT NULL,
      last_seen_at       INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_users_best ON users(best_score DESC);

    -- Inventario: skins (qty=1), mejoras (qty=nivel), consumibles (qty=cantidad)
    CREATE TABLE IF NOT EXISTS inventory (
      user_id INTEGER NOT NULL REFERENCES users(id),
      item_id TEXT    NOT NULL,
      qty     INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, item_id)
    );

    CREATE TABLE IF NOT EXISTS runs (
      id                TEXT PRIMARY KEY,
      user_id           INTEGER NOT NULL REFERENCES users(id),
      seed              INTEGER NOT NULL,
      status            TEXT    NOT NULL DEFAULT 'active', -- active | finished | abandoned
      multiplier        INTEGER NOT NULL DEFAULT 1,
      revives           INTEGER NOT NULL DEFAULT 0,
      items_used        TEXT    NOT NULL DEFAULT '[]',
      started_at        INTEGER NOT NULL,
      finished_at       INTEGER,
      reported_distance REAL,
      reported_coins    INTEGER,
      distance          REAL,
      coins_collected   INTEGER,
      coins_awarded     INTEGER,
      score             INTEGER,
      flagged           INTEGER NOT NULL DEFAULT 0,
      flag_reason       TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_runs_user ON runs(user_id, started_at DESC);

    CREATE TABLE IF NOT EXISTS ad_views (
      id          TEXT PRIMARY KEY,
      user_id     INTEGER NOT NULL REFERENCES users(id),
      run_id      TEXT,
      type        TEXT    NOT NULL,              -- multiplier | revive
      provider    TEXT    NOT NULL,
      status      TEXT    NOT NULL DEFAULT 'pending', -- pending | verified | rewarded | expired
      created_at  INTEGER NOT NULL,
      verified_at INTEGER,
      rewarded_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_ads_user ON ad_views(user_id, created_at DESC);

    -- Libro contable de monedas: cada movimiento queda registrado (auditoría).
    CREATE TABLE IF NOT EXISTS coin_ledger (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id),
      delta      INTEGER NOT NULL,
      reason     TEXT    NOT NULL,
      ref        TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ledger_user ON coin_ledger(user_id, created_at DESC);
  `);
}
