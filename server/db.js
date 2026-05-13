const Database = require('better-sqlite3');

let db;

function getDb() {
  if (!db) throw new Error('Database not initialized — call initDb() first');
  return db;
}

function initDb(dbPath) {
  const resolvedPath = dbPath || process.env.DATABASE_PATH || './lunchinator.db';
  db = new Database(resolvedPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS restaurants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      cuisine TEXT,
      doordash_url TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS lunch_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      restaurant_id INTEGER,
      organizer_slack_id TEXT NOT NULL,
      attendee_slack_ids TEXT NOT NULL,
      mode TEXT NOT NULL CHECK(mode IN ('random','manual')),
      deadline_at TEXT NOT NULL,
      slack_message_ts TEXT,
      slack_channel_id TEXT,
      picked_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS rsvps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      slack_user_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(session_id, slack_user_id)
    );
  `);
  const existing = db.prepare("SELECT key FROM settings WHERE key = 'default_deadline_minutes'").get();
  if (!existing) {
    db.prepare("INSERT INTO settings (key, value) VALUES ('default_deadline_minutes', '30')").run();
  }
  return db;
}

module.exports = { initDb, getDb };
