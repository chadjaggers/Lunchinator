# Lunchinator

A Slack bot that takes the "where should we eat?" debate off the table. Pick a restaurant or let it randomize one, then instantly share a DoorDash group order link with exactly the people joining that day.

---

## How it works

### From the admin panel (recommended)

1. Open the admin panel at `http://localhost:3000`
2. Pick a restaurant from the dropdown, or hit **Surprise me** for a random spin
3. Paste the DoorDash group order link (optional — can be added later)
4. Set an order deadline (or use the default)
5. Select who's coming — **Regulars** (your most frequent lunch crew) are shown first for quick picks; search and browse everyone else below
6. Hit **Send to Slack** — the bot opens a group DM with a Block Kit card containing:
   - Restaurant name and DoorDash group order link
   - **"I've ordered"** RSVP button with a live count
   - Countdown timer that updates every minute
   - **"Spin again"** button (random mode only)
7. At 5 minutes to the deadline the bot posts an `@here` reminder
8. When the deadline hits, the bot posts a "Time's up!" message

> **Large groups:** Slack limits group DMs to 8 people. If you select more than 7 attendees, Lunchinator automatically splits them into groups of 7 and sends the same card to each group. RSVP counts, countdowns, and reminders stay in sync across all groups.

### From Slack (slash command)

Run `/lunchinator spin` in any channel to open the spin modal directly in Slack.

---

## Features

- **Web admin panel** — launch sessions, manage the restaurant list, and configure settings at `http://localhost:3000`
- **Regulars grid** — the 15 people you order with most often are surfaced at the top of the crew picker; selection frequency is tracked automatically after each launch
- **Channel-based crew filtering** — configure a Slack channel ID in Settings to limit the crew picker to only show members of that channel
- **Large group support** — automatically splits crews larger than 7 into multiple group DMs and keeps all groups in sync
- **Two pick modes** — manual selection or weighted random spin
- **Searchable restaurant picker** — type to filter, or hit Surprise me for a random pick
- **Live countdown** — the Slack card updates every minute until the deadline
- **5-minute reminder** — bot posts an `@here` nudge when time is almost up
- **Slash commands** — `/lunchinator spin | add | remove | list | admin`
- **Persistent storage** — SQLite database (zero infra required)

---

## Quick start

### Prerequisites

- Node.js 20+
- A Slack workspace where you can install apps

### 1. Install dependencies and build

```bash
npm install && cd client && npm install && npm run build && cd ..
```

### 2. Create the Slack app

Go to [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → **From a manifest** → paste the contents of `slack-manifest.json`.

Then collect three tokens and add them to `.env` (copy from `.env.example`):

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

## Settings

Open the **Settings** section at the bottom of the admin panel to configure:

| Setting | Description |
|---|---|
| **Lunch channel ID** | Slack channel ID (e.g. `C01234ABCDE`) — filters the crew picker to only show members of this channel. Leave blank to show all workspace members. Requires `channels:read` (public) or `groups:read` (private) scope. |
| **Default deadline** | How many minutes after launch the order deadline is set. |

---

## Slash commands

| Command | What it does |
|---|---|
| `/lunchinator spin` | Open the spin modal |
| `/lunchinator add <name>` | Add a restaurant to the list |
| `/lunchinator remove <name>` | Remove a restaurant |
| `/lunchinator list` | List all restaurants |
| `/lunchinator admin` | Open the web admin panel |

---

## Deploy with Docker

```bash
docker-compose up -d
```

SQLite data is persisted in `./data/lunchinator.db` on the host. Make sure `.env` is filled in before starting.

> **Railway / cloud deploys:** Mount a persistent volume at `/app/data` and set `DATABASE_PATH=/app/data/lunchinator.db` so the database survives redeploys.

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

For channel-based crew filtering, also add one of:
- `channels:read` — if your lunch channel is public
- `groups:read` — if your lunch channel is private

All base scopes are pre-configured in `slack-manifest.json`.
