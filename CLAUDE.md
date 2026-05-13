# CLAUDE.md — Lunchinator Prototype

## Prototype rules

- Every shortcut must be marked: `// POC: <what's faked> → <what production needs>`
- No real secrets — use `.env.example` placeholders only; real credentials go in `.env` (gitignored)
- No real PHI/PII/PCI data — use Faker for any personal data in seeds
- Update `PROTOTYPE.md` with a dated entry for any meaningful change

## Stack

- **Server:** Node.js (CommonJS), Slack Bolt SDK, Express, better-sqlite3, node-cron
- **Client:** React 19, Vite, Tailwind CSS v4
- **Test runner:** Vitest (ESM test files, CommonJS server code)

## File structure

```
server/
  index.js          # Entry: Bolt app + Express + scheduler
  db.js             # SQLite singleton: initDb(path?), getDb()
  routes/api.js     # REST API factory: buildRouter(db)
  scheduler.js      # Per-minute cron: startScheduler(slackClient)
  slack/
    commands.js     # /lunchinator slash command
    modals.js       # spin_modal view + restaurant_input options
    actions.js      # rsvp, spin_again, open_doordash actions
    messages.js     # buildLunchCard(), formatDeadline()
client/src/
  App.jsx           # Root: settings + restaurant list
  api.js            # fetch wrappers for /api/*
  components/
    RestaurantForm.jsx
    RestaurantList.jsx
    SettingsPanel.jsx
tests/
  db.test.js
  messages.test.js
  api.test.js
```

## Running locally

```bash
# 1. Install all dependencies
npm install && cd client && npm install && cd ..

# 2. Copy env file and fill in real Slack credentials
cp .env.example .env

# 3. Build the admin panel
cd client && npm run build && cd ..

# 4. Start the server (Socket Mode for local Slack dev)
npm start
# Admin panel: http://localhost:3000
```

## Tests

```bash
npm test          # run all tests once
npm run test:watch  # watch mode
```

## Slack App setup (one-time manual)

See Task 10 in `docs/superpowers/plans/2026-05-13-lunchinator.md`.

Required OAuth scopes: `chat:write`, `commands`, `groups:write`, `im:write`, `mpim:write`, `users:read`

For local dev, enable Socket Mode and add `SLACK_APP_TOKEN` to `.env`.
