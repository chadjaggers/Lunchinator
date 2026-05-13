# Lunchinator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Slack bot that randomizes or lets organizers pick a lunch restaurant, notifies a selected group via group DM with a DoorDash group order link and countdown timer, and provides a web admin panel for managing the restaurant list.

**Architecture:** A Node.js monorepo with two packages — a Slack Bolt app that handles slash commands, modals, and Block Kit messages, and a React+Vite admin panel served by the same Express server. SQLite stores restaurants, sessions, RSVPs, and settings. A background scheduler updates the Slack message countdown and posts a "time's up" reminder when the deadline expires.

**Tech Stack:** Node.js 20, Slack Bolt SDK, Express, better-sqlite3, React 18, Vite, Tailwind CSS

---

## File Structure

```
lunchinator/
├── package.json                     # root, workspaces
├── .env.example
├── server/
│   ├── index.js                     # Express + Bolt app entry
│   ├── db.js                        # SQLite connection + migrations
│   ├── routes/
│   │   └── api.js                   # REST endpoints for admin panel
│   ├── slack/
│   │   ├── commands.js              # /lunchinator slash command handlers
│   │   ├── modals.js                # modal open + submission handlers
│   │   ├── messages.js              # Block Kit card builder
│   │   └── actions.js               # "I'm in" + "Spin again" button handlers
│   └── scheduler.js                 # deadline countdown updater
├── client/
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── components/
│       │   ├── RestaurantList.jsx
│       │   ├── RestaurantForm.jsx
│       │   └── SettingsPanel.jsx
│       └── api.js                   # fetch wrapper for REST endpoints
├── tests/
│   ├── db.test.js
│   ├── messages.test.js
│   └── api.test.js
└── docs/
    └── superpowers/
        ├── specs/2026-05-13-lunchinator-design.md
        └── plans/2026-05-13-lunchinator.md
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `.env.example`
- Create: `server/index.js`

- [ ] **Step 1: Initialize the project**

```bash
cd /Users/chadjaggers/Development/lunchinator
npm init -y
npm install @slack/bolt express better-sqlite3 dotenv node-cron
npm install -D vitest @vitest/coverage-v8
```

- [ ] **Step 2: Create `.env.example`**

```bash
# POC: All values are placeholders → replace with real secrets in production
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_APP_TOKEN=xapp-your-app-token
PORT=3000
DATABASE_PATH=./lunchinator.db
# POC: Admin panel unprotected → needs auth in Stage 2
```

- [ ] **Step 3: Copy to `.env` and fill in your Slack app credentials**

```bash
cp .env.example .env
```

- [ ] **Step 4: Create `server/index.js`**

```js
require('dotenv').config();
const { App, ExpressReceiver } = require('@slack/bolt');
const express = require('express');
const path = require('path');
const { initDb } = require('./db');
const apiRoutes = require('./routes/api');
const registerCommands = require('./slack/commands');
const registerModals = require('./slack/modals');
const registerActions = require('./slack/actions');

const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver,
  socketMode: false,
});

receiver.app.use(express.json());
receiver.app.use('/api', apiRoutes);
receiver.app.use(express.static(path.join(__dirname, '../client/dist')));
receiver.app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

registerCommands(app);
registerModals(app);
registerActions(app);

(async () => {
  initDb();
  await app.start(process.env.PORT || 3000);
  console.log(`Lunchinator running on port ${process.env.PORT || 3000}`);
})();
```

- [ ] **Step 5: Add start script to `package.json`**

Add to the `scripts` section:
```json
"scripts": {
  "start": "node server/index.js",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 6: Commit**

```bash
git init
git add .
git commit -m "feat: project scaffold with Slack Bolt + Express"
```

---

## Task 2: Database Setup

**Files:**
- Create: `server/db.js`
- Create: `tests/db.test.js`

- [ ] **Step 1: Write the failing test**

```js
// tests/db.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';

// Use in-memory DB for tests
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
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm test -- tests/db.test.js
```
Expected: FAIL — module not found or schema errors.

- [ ] **Step 3: Create `server/db.js`**

```js
const Database = require('better-sqlite3');
const path = require('path');

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
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- tests/db.test.js
```
Expected: 4 passing.

- [ ] **Step 5: Commit**

```bash
git add server/db.js tests/db.test.js
git commit -m "feat: SQLite schema and db helpers"
```

---

## Task 3: Block Kit Message Builder

**Files:**
- Create: `server/slack/messages.js`
- Create: `tests/messages.test.js`

- [ ] **Step 1: Write the failing test**

```js
// tests/messages.test.js
import { describe, it, expect } from 'vitest';
import { buildLunchCard } from '../server/slack/messages.js';

const baseParams = {
  restaurant: { name: 'Chipotle', cuisine: 'Mexican', doordash_url: 'https://doordash.com/group/abc' },
  deadlineAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  rsvpCount: 0,
  sessionId: 1,
  mode: 'random',
};

describe('buildLunchCard', () => {
  it('includes restaurant name in the card', () => {
    const blocks = buildLunchCard(baseParams);
    const text = JSON.stringify(blocks);
    expect(text).toContain('Chipotle');
  });

  it('includes DoorDash URL as a button', () => {
    const blocks = buildLunchCard(baseParams);
    const text = JSON.stringify(blocks);
    expect(text).toContain('https://doordash.com/group/abc');
  });

  it('includes rsvp count', () => {
    const blocks = buildLunchCard({ ...baseParams, rsvpCount: 3 });
    const text = JSON.stringify(blocks);
    expect(text).toContain('3');
  });

  it('includes spin again button only in random mode', () => {
    const randomBlocks = JSON.stringify(buildLunchCard({ ...baseParams, mode: 'random' }));
    const manualBlocks = JSON.stringify(buildLunchCard({ ...baseParams, mode: 'manual' }));
    expect(randomBlocks).toContain('spin_again');
    expect(manualBlocks).not.toContain('spin_again');
  });

  it('includes deadline countdown text', () => {
    const blocks = buildLunchCard(baseParams);
    const text = JSON.stringify(blocks);
    expect(text).toMatch(/Order by/);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm test -- tests/messages.test.js
```
Expected: FAIL — module not found.

- [ ] **Step 3: Create `server/slack/messages.js`**

```js
function formatDeadline(deadlineAt) {
  const deadline = new Date(deadlineAt);
  const now = new Date();
  const diffMs = deadline - now;
  const diffMin = Math.max(0, Math.round(diffMs / 60000));
  const timeStr = deadline.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return diffMin > 0
    ? `⏱ Order by ${timeStr} (${diffMin} min left)`
    : `⏱ Order deadline passed`;
}

function buildLunchCard({ restaurant, deadlineAt, rsvpCount, sessionId, mode }) {
  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `🍽️ Today's Lunch: ${restaurant.name}` },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Cuisine:*\n${restaurant.cuisine || 'N/A'}` },
        { type: 'mrkdwn', text: `*${formatDeadline(deadlineAt)}*` },
      ],
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: '🛒 Open DoorDash Group Order' },
          url: restaurant.doordash_url,
          style: 'primary',
        },
        {
          type: 'button',
          action_id: 'rsvp',
          text: { type: 'plain_text', text: `🙋 I'm in (${rsvpCount})` },
          value: String(sessionId),
        },
        ...(mode === 'random' ? [{
          type: 'button',
          action_id: 'spin_again',
          text: { type: 'plain_text', text: '🎲 Spin again' },
          value: String(sessionId),
        }] : []),
      ],
    },
  ];
  return blocks;
}

module.exports = { buildLunchCard, formatDeadline };
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- tests/messages.test.js
```
Expected: 5 passing.

- [ ] **Step 5: Commit**

```bash
git add server/slack/messages.js tests/messages.test.js
git commit -m "feat: Block Kit lunch card builder"
```

---

## Task 4: REST API for Admin Panel

**Files:**
- Create: `server/routes/api.js`
- Create: `tests/api.test.js`

- [ ] **Step 1: Write the failing test**

```js
// tests/api.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// We'll need supertest: npm install -D supertest
import { initDb } from '../server/db.js';
import apiRoutes from '../server/routes/api.js';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', apiRoutes(initDb(':memory:')));
  return app;
}

describe('REST API', () => {
  let app;
  beforeEach(() => { app = buildApp(); });

  it('GET /api/restaurants returns empty array initially', async () => {
    const res = await request(app).get('/api/restaurants');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('POST /api/restaurants creates a restaurant', async () => {
    const res = await request(app).post('/api/restaurants').send({
      name: 'Chipotle', cuisine: 'Mexican', doordash_url: 'https://doordash.com/group/abc'
    });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Chipotle');
  });

  it('DELETE /api/restaurants/:id removes a restaurant', async () => {
    await request(app).post('/api/restaurants').send({ name: 'Chipotle', cuisine: 'Mexican', doordash_url: 'https://x.com' });
    const list = await request(app).get('/api/restaurants');
    const id = list.body[0].id;
    const res = await request(app).delete(`/api/restaurants/${id}`);
    expect(res.status).toBe(204);
  });

  it('GET /api/settings returns default_deadline_minutes', async () => {
    const res = await request(app).get('/api/settings');
    expect(res.status).toBe(200);
    expect(res.body.default_deadline_minutes).toBe('30');
  });

  it('PUT /api/settings updates default_deadline_minutes', async () => {
    await request(app).put('/api/settings').send({ default_deadline_minutes: '45' });
    const res = await request(app).get('/api/settings');
    expect(res.body.default_deadline_minutes).toBe('45');
  });
});
```

- [ ] **Step 2: Install supertest**

```bash
npm install -D supertest
```

- [ ] **Step 3: Run test to confirm it fails**

```bash
npm test -- tests/api.test.js
```
Expected: FAIL — module not found.

- [ ] **Step 4: Refactor `server/db.js` to accept an optional path parameter**

Update `initDb` signature so tests can pass `':memory:'`:
```js
// Already done in Task 2 — initDb(dbPath) accepts optional path. No change needed.
```

- [ ] **Step 5: Create `server/routes/api.js`**

```js
const express = require('express');

function buildRouter(db) {
  const router = express.Router();

  // Restaurants
  router.get('/restaurants', (req, res) => {
    const rows = db.prepare('SELECT * FROM restaurants ORDER BY name').all();
    res.json(rows);
  });

  router.post('/restaurants', (req, res) => {
    const { name, cuisine, doordash_url } = req.body;
    if (!name || !doordash_url) return res.status(400).json({ error: 'name and doordash_url required' });
    const result = db.prepare('INSERT INTO restaurants (name, cuisine, doordash_url) VALUES (?, ?, ?)').run(name, cuisine || null, doordash_url);
    const row = db.prepare('SELECT * FROM restaurants WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(row);
  });

  router.put('/restaurants/:id', (req, res) => {
    const { name, cuisine, doordash_url } = req.body;
    if (!name || !doordash_url) return res.status(400).json({ error: 'name and doordash_url required' });
    db.prepare('UPDATE restaurants SET name = ?, cuisine = ?, doordash_url = ? WHERE id = ?').run(name, cuisine || null, doordash_url, req.params.id);
    const row = db.prepare('SELECT * FROM restaurants WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'not found' });
    res.json(row);
  });

  router.delete('/restaurants/:id', (req, res) => {
    db.prepare('DELETE FROM restaurants WHERE id = ?').run(req.params.id);
    res.status(204).end();
  });

  // Settings
  router.get('/settings', (req, res) => {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = Object.fromEntries(rows.map(r => [r.key, r.value]));
    res.json(settings);
  });

  router.put('/settings', (req, res) => {
    for (const [key, value] of Object.entries(req.body)) {
      db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, String(value));
    }
    const rows = db.prepare('SELECT key, value FROM settings').all();
    res.json(Object.fromEntries(rows.map(r => [r.key, r.value])));
  });

  return router;
}

module.exports = buildRouter;
```

- [ ] **Step 6: Update `server/index.js` to pass db to router**

Replace:
```js
receiver.app.use('/api', apiRoutes);
```
With:
```js
const db = initDb();
receiver.app.use('/api', apiRoutes(db));
```
And remove the `initDb()` call from the IIFE (it's now called before).

- [ ] **Step 7: Run tests to confirm they pass**

```bash
npm test -- tests/api.test.js
```
Expected: 5 passing.

- [ ] **Step 8: Commit**

```bash
git add server/routes/api.js tests/api.test.js server/index.js
git commit -m "feat: REST API for restaurant and settings management"
```

---

## Task 5: Slack Slash Commands

**Files:**
- Create: `server/slack/commands.js`

- [ ] **Step 1: Create `server/slack/commands.js`**

```js
const { getDb } = require('../db');

function registerCommands(app) {
  app.command('/lunchinator', async ({ command, ack, respond, client }) => {
    await ack();
    const [subcommand, ...args] = command.text.trim().split(/\s+/);

    if (!subcommand || subcommand === 'spin') {
      const db = getDb();
      const setting = db.prepare("SELECT value FROM settings WHERE key = 'default_deadline_minutes'").get();
      const defaultMinutes = setting ? setting.value : '30';
      await client.views.open({
        trigger_id: command.trigger_id,
        view: buildSpinModal(defaultMinutes),
      });
      return;
    }

    if (subcommand === 'add') {
      const [name, doordash_url] = args;
      if (!name || !doordash_url) {
        return respond('Usage: `/lunchinator add "Restaurant Name" https://doordash-group-link`');
      }
      const db = getDb();
      db.prepare('INSERT INTO restaurants (name, doordash_url) VALUES (?, ?)').run(name.replace(/"/g, ''), doordash_url);
      return respond(`✅ Added *${name}* to the list.`);
    }

    if (subcommand === 'remove') {
      const name = args.join(' ').replace(/"/g, '');
      const db = getDb();
      const row = db.prepare('SELECT id FROM restaurants WHERE name = ?').get(name);
      if (!row) return respond(`❌ No restaurant named "${name}" found.`);
      db.prepare('DELETE FROM restaurants WHERE id = ?').run(row.id);
      return respond(`🗑️ Removed *${name}* from the list.`);
    }

    if (subcommand === 'list') {
      const db = getDb();
      const rows = db.prepare('SELECT name, cuisine FROM restaurants ORDER BY name').all();
      if (!rows.length) return respond('No restaurants yet. Add one with `/lunchinator add "Name" [doordash-url]`');
      const list = rows.map(r => `• *${r.name}*${r.cuisine ? ` — ${r.cuisine}` : ''}`).join('\n');
      return respond(`*Current restaurant list:*\n${list}`);
    }

    if (subcommand === 'admin') {
      const adminUrl = `${process.env.APP_URL || 'http://localhost:3000'}`;
      return respond(`🔧 Manage restaurants and settings: ${adminUrl}`);
    }

    await respond('Unknown command. Try: `spin`, `add`, `remove`, `list`, `admin`');
  });
}

function buildSpinModal(defaultMinutes) {
  return {
    type: 'modal',
    callback_id: 'spin_modal',
    title: { type: 'plain_text', text: '🍽️ Lunchinator' },
    submit: { type: 'plain_text', text: "Let's eat 🍽️" },
    close: { type: 'plain_text', text: 'Cancel' },
    blocks: [
      {
        type: 'input',
        block_id: 'attendees',
        label: { type: 'plain_text', text: "Who's coming?" },
        element: {
          type: 'multi_users_select',
          action_id: 'attendees_input',
          placeholder: { type: 'plain_text', text: 'Select people...' },
        },
      },
      {
        type: 'input',
        block_id: 'restaurant_mode',
        label: { type: 'plain_text', text: 'Restaurant' },
        element: {
          type: 'radio_buttons',
          action_id: 'mode_input',
          initial_option: {
            text: { type: 'plain_text', text: "📋 I'll pick one" },
            value: 'manual',
          },
          options: [
            { text: { type: 'plain_text', text: "📋 I'll pick one" }, value: 'manual' },
            { text: { type: 'plain_text', text: '🎲 Surprise me' }, value: 'random' },
          ],
        },
      },
      {
        type: 'input',
        block_id: 'restaurant_pick',
        optional: true,
        label: { type: 'plain_text', text: 'Choose a restaurant' },
        element: {
          type: 'external_select',
          action_id: 'restaurant_input',
          placeholder: { type: 'plain_text', text: 'Choose a restaurant...' },
          min_query_length: 0,
        },
      },
      {
        type: 'input',
        block_id: 'deadline',
        label: { type: 'plain_text', text: 'Order deadline (minutes from now)' },
        element: {
          type: 'plain_text_input',
          action_id: 'deadline_input',
          initial_value: String(defaultMinutes),
          placeholder: { type: 'plain_text', text: 'e.g. 30' },
        },
      },
    ],
  };
}

module.exports = registerCommands;
```

- [ ] **Step 2: Add `APP_URL` to `.env.example`**

```bash
APP_URL=http://localhost:3000
```

- [ ] **Step 3: Start the server and test `/lunchinator list` in Slack**

```bash
npm start
```
In Slack, run `/lunchinator list` — expect "No restaurants yet."

- [ ] **Step 4: Commit**

```bash
git add server/slack/commands.js .env.example
git commit -m "feat: /lunchinator slash command with spin, add, remove, list, admin"
```

---

## Task 6: Modal Submission + Group DM

**Files:**
- Create: `server/slack/modals.js`

- [ ] **Step 1: Create `server/slack/modals.js`**

```js
const { getDb } = require('../db');
const { buildLunchCard } = require('./messages');

function registerModals(app) {
  // External select options for restaurant picker
  app.options({ action_id: 'restaurant_input' }, async ({ options, ack }) => {
    const db = getDb();
    const rows = db.prepare('SELECT id, name FROM restaurants ORDER BY name').all();
    await ack({
      options: rows.map(r => ({
        text: { type: 'plain_text', text: r.name },
        value: String(r.id),
      })),
    });
  });

  // Modal submission
  app.view('spin_modal', async ({ ack, view, client, body }) => {
    await ack();

    const values = view.state.values;
    const attendeeIds = values.attendees.attendees_input.selected_users;
    const mode = values.restaurant_mode.mode_input.selected_option.value;
    const deadlineMinutes = parseInt(values.deadline.deadline_input.value, 10) || 30;
    const deadlineAt = new Date(Date.now() + deadlineMinutes * 60 * 1000).toISOString();
    const organizerId = body.user.id;

    const db = getDb();
    let restaurant;

    if (mode === 'random') {
      const rows = db.prepare('SELECT * FROM restaurants').all();
      if (!rows.length) {
        await client.chat.postMessage({
          channel: organizerId,
          text: '❌ No restaurants in the list yet. Add some with `/lunchinator add`.',
        });
        return;
      }
      restaurant = rows[Math.floor(Math.random() * rows.length)];
    } else {
      const selected = values.restaurant_pick?.restaurant_input?.selected_option;
      if (!selected) {
        await client.chat.postMessage({
          channel: organizerId,
          text: '❌ Please select a restaurant.',
        });
        return;
      }
      restaurant = db.prepare('SELECT * FROM restaurants WHERE id = ?').get(selected.value);
    }

    // All participants including organizer
    const allUsers = [...new Set([organizerId, ...attendeeIds])];

    // Open group DM
    const convResult = await client.conversations.open({ users: allUsers.join(',') });
    const channelId = convResult.channel.id;

    // Insert session
    const result = db.prepare(`
      INSERT INTO lunch_sessions (restaurant_id, organizer_slack_id, attendee_slack_ids, mode, deadline_at, slack_channel_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(restaurant.id, organizerId, JSON.stringify(allUsers), mode, deadlineAt, channelId);

    const sessionId = result.lastInsertRowid;

    // Post the card
    const msgResult = await client.chat.postMessage({
      channel: channelId,
      blocks: buildLunchCard({ restaurant, deadlineAt, rsvpCount: 0, sessionId, mode }),
      text: `Today's lunch: ${restaurant.name}`,
    });

    // Save message ts for later edits
    db.prepare('UPDATE lunch_sessions SET slack_message_ts = ? WHERE id = ?').run(msgResult.ts, sessionId);
  });
}

module.exports = registerModals;
```

- [ ] **Step 2: Test in Slack**

Run `/lunchinator spin`, fill in the modal, submit — expect a group DM to open with the Block Kit card.

- [ ] **Step 3: Commit**

```bash
git add server/slack/modals.js
git commit -m "feat: modal submission opens group DM with Block Kit lunch card"
```

---

## Task 7: RSVP + Spin Again Actions

**Files:**
- Create: `server/slack/actions.js`

- [ ] **Step 1: Create `server/slack/actions.js`**

```js
const { getDb } = require('../db');
const { buildLunchCard } = require('./messages');

function registerActions(app) {
  app.action('rsvp', async ({ ack, action, body, client }) => {
    await ack();
    const db = getDb();
    const sessionId = parseInt(action.value, 10);
    const userId = body.user.id;

    try {
      db.prepare('INSERT INTO rsvps (session_id, slack_user_id) VALUES (?, ?)').run(sessionId, userId);
    } catch {
      // Already RSVP'd — ignore duplicate
    }

    const session = db.prepare('SELECT * FROM lunch_sessions WHERE id = ?').get(sessionId);
    const restaurant = db.prepare('SELECT * FROM restaurants WHERE id = ?').get(session.restaurant_id);
    const rsvpCount = db.prepare('SELECT COUNT(*) as count FROM rsvps WHERE session_id = ?').get(sessionId).count;

    await client.chat.update({
      channel: session.slack_channel_id,
      ts: session.slack_message_ts,
      blocks: buildLunchCard({ restaurant, deadlineAt: session.deadline_at, rsvpCount, sessionId, mode: session.mode }),
      text: `Today's lunch: ${restaurant.name}`,
    });
  });

  app.action('spin_again', async ({ ack, action, body, client }) => {
    await ack();
    const db = getDb();
    const sessionId = parseInt(action.value, 10);
    const session = db.prepare('SELECT * FROM lunch_sessions WHERE id = ?').get(sessionId);

    const rows = db.prepare('SELECT * FROM restaurants WHERE id != ?').all(session.restaurant_id);
    if (!rows.length) return;
    const restaurant = rows[Math.floor(Math.random() * rows.length)];

    db.prepare('UPDATE lunch_sessions SET restaurant_id = ? WHERE id = ?').run(restaurant.id, sessionId);
    db.prepare('DELETE FROM rsvps WHERE session_id = ?').run(sessionId);

    await client.chat.update({
      channel: session.slack_channel_id,
      ts: session.slack_message_ts,
      blocks: buildLunchCard({ restaurant, deadlineAt: session.deadline_at, rsvpCount: 0, sessionId, mode: 'random' }),
      text: `Today's lunch: ${restaurant.name}`,
    });
  });
}

module.exports = registerActions;
```

- [ ] **Step 2: Test RSVP in Slack**

Click "I'm in 🙋" — expect the count to increment on the card.

- [ ] **Step 3: Test Spin Again in Slack**

Click "🎲 Spin again" — expect the card to update with a different restaurant and the RSVP count to reset.

- [ ] **Step 4: Commit**

```bash
git add server/slack/actions.js
git commit -m "feat: RSVP and spin again action handlers"
```

---

## Task 8: Deadline Scheduler

**Files:**
- Create: `server/scheduler.js`

- [ ] **Step 1: Create `server/scheduler.js`**

```js
const cron = require('node-cron');
const { getDb } = require('./db');
const { buildLunchCard } = require('./slack/messages');

function startScheduler(slackClient) {
  // Every minute: update countdown and post "time's up" when expired
  cron.schedule('* * * * *', async () => {
    const db = getDb();
    const now = new Date().toISOString();

    // Sessions with an active message that haven't been notified yet
    const sessions = db.prepare(`
      SELECT ls.*, r.name, r.cuisine, r.doordash_url
      FROM lunch_sessions ls
      JOIN restaurants r ON r.id = ls.restaurant_id
      WHERE ls.slack_message_ts IS NOT NULL
        AND ls.slack_channel_id IS NOT NULL
        AND ls.deadline_at > datetime('now', '-1 minute')
    `).all();

    for (const session of sessions) {
      const rsvpCount = db.prepare('SELECT COUNT(*) as count FROM rsvps WHERE session_id = ?').get(session.id).count;
      const restaurant = { name: session.name, cuisine: session.cuisine, doordash_url: session.doordash_url };
      try {
        await slackClient.chat.update({
          channel: session.slack_channel_id,
          ts: session.slack_message_ts,
          blocks: buildLunchCard({ restaurant, deadlineAt: session.deadline_at, rsvpCount, sessionId: session.id, mode: session.mode }),
          text: `Today's lunch: ${session.name}`,
        });
      } catch {
        // Message may have been deleted — skip
      }
    }

    // Sessions that just expired — post a "time's up" message once
    const expired = db.prepare(`
      SELECT ls.*, r.name
      FROM lunch_sessions ls
      JOIN restaurants r ON r.id = ls.restaurant_id
      WHERE ls.slack_channel_id IS NOT NULL
        AND ls.deadline_at <= ?
        AND ls.deadline_at > datetime(?, '-1 minute')
    `).all(now, now);

    for (const session of expired) {
      try {
        await slackClient.chat.postMessage({
          channel: session.slack_channel_id,
          text: `⏰ Order deadline for *${session.name}* has passed! Hope everyone got their order in 🍽️`,
        });
      } catch {
        // Channel may no longer be accessible
      }
    }
  });
}

module.exports = { startScheduler };
```

- [ ] **Step 2: Wire scheduler into `server/index.js`**

Add after `initDb()`:
```js
const { startScheduler } = require('./scheduler');
// ...inside the IIFE after app.start():
startScheduler(app.client);
```

- [ ] **Step 3: Test end-to-end**

Set a 2-minute deadline in the modal, watch the countdown update each minute, then confirm the "time's up" message posts.

- [ ] **Step 4: Commit**

```bash
git add server/scheduler.js server/index.js
git commit -m "feat: per-minute countdown updater and deadline expiry notification"
```

---

## Task 9: React Admin Panel

**Files:**
- Create: `client/` (full Vite + React app)

- [ ] **Step 1: Scaffold the client**

```bash
npm create vite@latest client -- --template react
cd client
npm install
npm install -D tailwindcss @tailwindcss/vite
```

- [ ] **Step 2: Configure Tailwind in `client/vite.config.js`**

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: { '/api': 'http://localhost:3000' },
  },
});
```

- [ ] **Step 3: Add Phase2 colors to `client/src/index.css`**

```css
@import "tailwindcss";

:root {
  --abyss: #00233A;
  --indigo: #1A3B6F;
  --cyan: #16A3D6;
  --ice: #9AE4FF;
  --coral: #F5543A;
}

body {
  background-color: var(--abyss);
  color: #f8fafc;
  font-family: 'Sora', sans-serif;
}

h1, h2, h3 { font-family: 'Manrope', sans-serif; }
```

- [ ] **Step 4: Add Google Fonts to `client/index.html`**

In `<head>`:
```html
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700&family=Sora:wght@400;500;700&display=swap" rel="stylesheet">
```

- [ ] **Step 5: Create `client/src/api.js`**

```js
const BASE = '/api';

export async function getRestaurants() {
  const r = await fetch(`${BASE}/restaurants`);
  return r.json();
}

export async function addRestaurant(data) {
  const r = await fetch(`${BASE}/restaurants`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  });
  return r.json();
}

export async function updateRestaurant(id, data) {
  const r = await fetch(`${BASE}/restaurants/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  });
  return r.json();
}

export async function deleteRestaurant(id) {
  await fetch(`${BASE}/restaurants/${id}`, { method: 'DELETE' });
}

export async function getSettings() {
  const r = await fetch(`${BASE}/settings`);
  return r.json();
}

export async function updateSettings(data) {
  const r = await fetch(`${BASE}/settings`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  });
  return r.json();
}
```

- [ ] **Step 6: Create `client/src/components/RestaurantForm.jsx`**

```jsx
import { useState } from 'react';

export default function RestaurantForm({ initial = {}, onSave, onCancel }) {
  const [name, setName] = useState(initial.name || '');
  const [cuisine, setCuisine] = useState(initial.cuisine || '');
  const [url, setUrl] = useState(initial.doordash_url || '');

  function handleSubmit(e) {
    e.preventDefault();
    onSave({ name, cuisine, doordash_url: url });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        required value={name} onChange={e => setName(e.target.value)}
        placeholder="Restaurant name"
        className="bg-[var(--indigo)] border border-[var(--cyan)] rounded px-3 py-2 text-white placeholder-slate-400"
      />
      <input
        value={cuisine} onChange={e => setCuisine(e.target.value)}
        placeholder="Cuisine type (optional)"
        className="bg-[var(--indigo)] border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400"
      />
      <input
        required value={url} onChange={e => setUrl(e.target.value)}
        placeholder="DoorDash group order URL"
        className="bg-[var(--indigo)] border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400"
      />
      <div className="flex gap-2">
        <button type="submit" className="bg-[var(--cyan)] text-white font-semibold px-4 py-2 rounded hover:opacity-90">
          Save
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="bg-slate-700 text-white px-4 py-2 rounded hover:opacity-90">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
```

- [ ] **Step 7: Create `client/src/components/RestaurantList.jsx`**

```jsx
import { useState } from 'react';
import { deleteRestaurant, updateRestaurant } from '../api';
import RestaurantForm from './RestaurantForm';

export default function RestaurantList({ restaurants, onRefresh }) {
  const [editingId, setEditingId] = useState(null);

  async function handleDelete(id) {
    if (!confirm('Remove this restaurant?')) return;
    await deleteRestaurant(id);
    onRefresh();
  }

  async function handleEdit(id, data) {
    await updateRestaurant(id, data);
    setEditingId(null);
    onRefresh();
  }

  if (!restaurants.length) {
    return <p className="text-slate-400">No restaurants yet. Add one below.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {restaurants.map(r => (
        <div key={r.id} className="bg-[var(--indigo)] rounded-lg p-4">
          {editingId === r.id ? (
            <RestaurantForm
              initial={r}
              onSave={data => handleEdit(r.id, data)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-white">{r.name}</p>
                {r.cuisine && <p className="text-sm text-slate-400">{r.cuisine}</p>}
                <a href={r.doordash_url} target="_blank" rel="noreferrer"
                  className="text-xs text-[var(--ice)] hover:underline truncate block max-w-xs">
                  {r.doordash_url}
                </a>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditingId(r.id)} className="text-sm text-[var(--cyan)] hover:underline">Edit</button>
                <button onClick={() => handleDelete(r.id)} className="text-sm text-[var(--coral)] hover:underline">Remove</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 8: Create `client/src/components/SettingsPanel.jsx`**

```jsx
import { useState } from 'react';
import { updateSettings } from '../api';

export default function SettingsPanel({ settings, onRefresh }) {
  const [minutes, setMinutes] = useState(settings.default_deadline_minutes || '30');
  const [saved, setSaved] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    await updateSettings({ default_deadline_minutes: minutes });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onRefresh();
  }

  return (
    <form onSubmit={handleSave} className="flex items-end gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-sm text-slate-400">Default order deadline (minutes)</label>
        <input
          type="number" min="1" max="180" value={minutes}
          onChange={e => setMinutes(e.target.value)}
          className="bg-[var(--indigo)] border border-slate-600 rounded px-3 py-2 text-white w-28"
        />
      </div>
      <button type="submit" className="bg-[var(--cyan)] text-white font-semibold px-4 py-2 rounded hover:opacity-90">
        {saved ? 'Saved ✓' : 'Save'}
      </button>
    </form>
  );
}
```

- [ ] **Step 9: Create `client/src/App.jsx`**

```jsx
import { useState, useEffect } from 'react';
import { getRestaurants, addRestaurant, getSettings } from './api';
import RestaurantList from './components/RestaurantList';
import RestaurantForm from './components/RestaurantForm';
import SettingsPanel from './components/SettingsPanel';

export default function App() {
  const [restaurants, setRestaurants] = useState([]);
  const [settings, setSettings] = useState({});
  const [showAdd, setShowAdd] = useState(false);

  async function refresh() {
    const [r, s] = await Promise.all([getRestaurants(), getSettings()]);
    setRestaurants(r);
    setSettings(s);
  }

  useEffect(() => { refresh(); }, []);

  async function handleAdd(data) {
    await addRestaurant(data);
    setShowAdd(false);
    refresh();
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold text-[var(--ice)] mb-1">🍽️ Lunchinator</h1>
      <p className="text-slate-400 mb-8">Admin panel — manage restaurants and settings</p>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-white mb-4">Settings</h2>
        <SettingsPanel settings={settings} onRefresh={refresh} />
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Restaurants ({restaurants.length})</h2>
          <button
            onClick={() => setShowAdd(v => !v)}
            className="bg-[var(--cyan)] text-white font-semibold px-4 py-2 rounded hover:opacity-90 text-sm"
          >
            {showAdd ? 'Cancel' : '+ Add Restaurant'}
          </button>
        </div>

        {showAdd && (
          <div className="bg-[var(--indigo)] rounded-lg p-4 mb-4">
            <RestaurantForm onSave={handleAdd} onCancel={() => setShowAdd(false)} />
          </div>
        )}

        <RestaurantList restaurants={restaurants} onRefresh={refresh} />
      </section>
    </div>
  );
}
```

- [ ] **Step 10: Build client and test locally**

```bash
cd client && npm run build && cd ..
npm start
```

Open `http://localhost:3000` — expect the admin panel with Phase2 brand colors.

- [ ] **Step 11: Commit**

```bash
git add client/
git commit -m "feat: React admin panel with Phase2 brand, restaurant CRUD, settings"
```

---

## Task 10: Slack App Setup (Reference)

This task is manual — you need a Slack workspace with admin access.

**The fast way: use the manifest file.** All scopes, slash commands, and settings are pre-configured in `slack-manifest.json` at the repo root. Paste it in Slack's UI and everything is set up in one step.

- [ ] **Step 1: Create app from manifest**
  1. Go to https://api.slack.com/apps
  2. Click **Create New App → From a manifest**
  3. Pick your workspace
  4. Paste the contents of `slack-manifest.json`
  5. Review and click **Create**

- [ ] **Step 2: Generate an App-Level Token (for Socket Mode)**
  Under *Basic Information → App-Level Tokens*, click **Generate Token and Scopes**:
  - Name: `lunchinator-socket`
  - Scope: `connections:write`
  - Copy the `xapp-...` token → `SLACK_APP_TOKEN` in `.env`

- [ ] **Step 3: Install to workspace**
  Under *OAuth & Permissions*, click **Install to Workspace**. Copy the `xoxb-...` Bot Token → `SLACK_BOT_TOKEN` in `.env`.

- [ ] **Step 4: Copy Signing Secret**
  Under *Basic Information → App Credentials*, copy the Signing Secret → `SLACK_SIGNING_SECRET` in `.env`.

- [x] **Step 5: Switch `server/index.js` to Socket Mode**

Change the Bolt app init to:
```js
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});
```

- [x] **Step 6: Commit**

```bash
git add server/index.js .env.example
git commit -m "feat: switch to Socket Mode for local Slack dev"
```

---

## Self-Review

**Spec coverage check:**
- ✅ `/lunchinator spin` modal with people picker → Task 5 + 6
- ✅ "I'll pick one" left default, "Surprise me" right → Task 5 `buildSpinModal`
- ✅ DoorDash group order link button → Task 3 `buildLunchCard`
- ✅ "I'm in 🙋" RSVP with live count → Task 7
- ✅ "Spin again 🎲" random mode only → Task 3 + 7
- ✅ Timer countdown on card, updates each minute → Task 3 + 8
- ✅ "Time's up" message when deadline passes → Task 8
- ✅ Default deadline in settings, organizer override in modal → Task 5 + 9
- ✅ Slack commands: add, remove, list, admin → Task 5
- ✅ Web admin panel: restaurant CRUD + settings → Task 9
- ✅ Phase2 brand (Deep Navy, Cyan, Manrope/Sora) → Task 9
- ✅ Group DM with selected attendees → Task 6
- ✅ Restaurant pool: curated list → Task 2 + 4
