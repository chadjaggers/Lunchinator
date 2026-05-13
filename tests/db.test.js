// tests/db.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';

// Use in-memory DB for tests — bypass the module singleton
function initTestDb() {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE restaurants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      cuisine TEXT,
      doordash_url TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE lunch_sessions (
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
    CREATE TABLE rsvps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      slack_user_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(session_id, slack_user_id)
    );
  `);
  db.prepare("INSERT INTO settings (key, value) VALUES ('default_deadline_minutes', '30')").run();
  return db;
}

describe('database', () => {
  let db;
  beforeEach(() => { db = initTestDb(); });

  it('inserts and retrieves a restaurant', () => {
    db.prepare("INSERT INTO restaurants (name, cuisine, doordash_url) VALUES (?, ?, ?)").run('Chipotle', 'Mexican', 'https://doordash.com/group/abc');
    const row = db.prepare("SELECT * FROM restaurants WHERE name = ?").get('Chipotle');
    expect(row.name).toBe('Chipotle');
    expect(row.cuisine).toBe('Mexican');
  });

  it('reads default_deadline_minutes setting', () => {
    const row = db.prepare("SELECT value FROM settings WHERE key = ?").get('default_deadline_minutes');
    expect(row.value).toBe('30');
  });

  it('inserts a lunch session', () => {
    db.prepare("INSERT INTO restaurants (name, cuisine, doordash_url) VALUES (?, ?, ?)").run('Chipotle', 'Mexican', 'https://doordash.com/group/abc');
    const restaurant = db.prepare("SELECT id FROM restaurants WHERE name = 'Chipotle'").get();
    db.prepare(`
      INSERT INTO lunch_sessions (restaurant_id, organizer_slack_id, attendee_slack_ids, mode, deadline_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(restaurant.id, 'U123', JSON.stringify(['U123','U456']), 'random', new Date(Date.now() + 30*60000).toISOString());
    const session = db.prepare("SELECT * FROM lunch_sessions WHERE organizer_slack_id = ?").get('U123');
    expect(session.mode).toBe('random');
    expect(JSON.parse(session.attendee_slack_ids)).toContain('U456');
  });

  it('prevents duplicate RSVPs', () => {
    db.prepare("INSERT INTO restaurants (name, cuisine, doordash_url) VALUES (?, ?, ?)").run('Chipotle', 'Mexican', 'https://doordash.com');
    const restaurant = db.prepare("SELECT id FROM restaurants").get();
    db.prepare("INSERT INTO lunch_sessions (restaurant_id, organizer_slack_id, attendee_slack_ids, mode, deadline_at) VALUES (?, ?, ?, ?, ?)").run(restaurant.id, 'U123', '[]', 'manual', new Date().toISOString());
    const session = db.prepare("SELECT id FROM lunch_sessions").get();
    db.prepare("INSERT INTO rsvps (session_id, slack_user_id) VALUES (?, ?)").run(session.id, 'U123');
    expect(() => {
      db.prepare("INSERT INTO rsvps (session_id, slack_user_id) VALUES (?, ?)").run(session.id, 'U123');
    }).toThrow();
  });
});
