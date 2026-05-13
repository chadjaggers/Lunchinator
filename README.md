# Lunchinator

A Slack bot that takes the "where should we eat?" debate off the table. Pick a restaurant or let it randomize one, then instantly share a DoorDash group order link with exactly the people joining that day.

---

## How it works

1. Run `/lunchinator spin` in any Slack channel
2. Pick who's coming via the people picker
3. Choose a restaurant ("I'll pick one") or let the bot surprise you ("Surprise me 🎲")
4. Set an order deadline (or use the default from the admin panel)
5. The bot opens a group DM with a Block Kit card containing:
   - Restaurant name and DoorDash group order link
   - "I'm in 🙋" RSVP button with a live count
   - Countdown timer that updates every minute
   - "Spin again 🎲" button (random mode only)
6. When the deadline hits, the bot posts a "Time's up!" reminder

---

## Features

- **Slash command** — `/lunchinator spin | add | remove | list | admin`
- **Modal people picker** — choose exactly who gets the group DM each day
- **Two pick modes** — manual selection or weighted random
- **Live countdown** — the card updates every minute until the deadline
- **Web admin panel** — manage the restaurant list and default deadline at `http://localhost:3000`
- **Persistent storage** — SQLite database (zero infra required)

---

## Quick start

### Prerequisites

- Node.js 20+
- A Slack workspace where you can install apps

### 1. Run setup

```bash
bash scripts/setup.sh
```

This installs dependencies, builds the admin panel, and creates your `.env` file.

### 2. Create the Slack app

Go to [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → **From a manifest** → paste the contents of `slack-manifest.json`.

Then collect three tokens and add them to `.env`:

| Token | Where to find it |
|---|---|
| `SLACK_BOT_TOKEN` | OAuth & Permissions → Bot User OAuth Token (`xoxb-…`) |
| `SLACK_SIGNING_SECRET` | Basic Information → Signing Secret |
| `SLACK_APP_TOKEN` | Basic Information → App-Level Tokens → create one with `connections:write` scope (`xapp-…`) |

### 3. Start the bot

```bash
npm start
```

Admin panel: [http://localhost:3000](http://localhost:3000)

---

## Other slash commands

| Command | What it does |
|---|---|
| `/lunchinator spin` | Open the spin modal |
| `/lunchinator add <name> <doordash-url>` | Add a restaurant to the list |
| `/lunchinator remove <name>` | Remove a restaurant |
| `/lunchinator list` | List all restaurants |
| `/lunchinator admin` | Open the web admin panel |

---

## Deploy with Docker

```bash
docker-compose up -d
```

SQLite data is persisted in `./data/lunchinator.db` on the host. Make sure `.env` is filled in before starting.

---

## Development

```bash
# Install all dependencies
npm install && cd client && npm install && cd ..

# Run tests
npm test

# Watch mode
npm run test:watch

# Build the admin panel
cd client && npm run build && cd ..

# Start the server
npm start
```

Tests use Vitest + Supertest against an in-memory SQLite database — no Slack credentials needed to run them.

---

## Stack

| Layer | Tech |
|---|---|
| Slack bot | [Slack Bolt SDK](https://slack.dev/bolt-js/) (Socket Mode) |
| Server | Node.js, Express |
| Database | SQLite via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) |
| Admin panel | React 19, Vite, Tailwind CSS v4 |
| Tests | Vitest, Supertest |
| Deployment | Docker |

---

## Required Slack scopes

`chat:write` `commands` `groups:write` `im:write` `mpim:write` `users:read`

All scopes are pre-configured in `slack-manifest.json`.
