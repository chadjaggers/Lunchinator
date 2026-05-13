# Lunchinator — Design Spec
**Date:** 2026-05-13
**Type:** Slack App + Web Admin Panel

---

## Overview

Lunchinator is a Slack bot that helps teams decide where to go for lunch and coordinates the group order. An organizer triggers the bot, picks who's joining that day, and either lets Lunchinator randomize a restaurant or selects one manually. The bot then opens a group DM with the chosen people and posts a rich interactive card with the restaurant details and a DoorDash group order link.

---

## User Flow

### 1. Trigger
- Organizer runs `/lunchinator spin` in any Slack channel
- A Slack modal opens

### 2. Modal
Two inputs:
- **Who's coming?** — Slack multi-person picker (select any number of teammates)
- **Restaurant mode** — toggle between (default: "I'll pick one"):
  - **"I'll pick one"** *(left, default)* — dropdown shows the full curated restaurant list
  - **"Surprise me"** *(right)* — Lunchinator picks randomly from the curated list (dropdown hidden)

- **Order deadline** — pre-filled with the default timer (set in admin), organizer can override per spin (e.g. "30 min" or a specific time like "12:30pm")

CTA: **"Let's eat 🍽️"**

### 3. Result — Group DM Block Kit Card
Bot opens a group DM with all selected people and posts a Block Kit card containing:
- Restaurant name + cuisine type
- **"Open DoorDash Group Order"** button — links to the pre-saved DoorDash group order URL for that restaurant
- **"I'm in 🙋"** button — tracks who confirms attendance (live count shown)
- **Order deadline countdown** — e.g. "⏱ Order by 12:30pm (28 min left)" — shown in the card, updated via Slack message edit
- **"Spin again 🎲"** button — re-randomizes if nobody's feeling the pick (only visible in Surprise Me mode)

---

## Restaurant List Management

Each restaurant record contains:
- Name
- Cuisine type
- DoorDash group order URL

### Slack commands (quick ops)
- `/lunchinator add "Chipotle" [doordash-url]` — add a restaurant
- `/lunchinator remove "Chipotle"` — remove a restaurant
- `/lunchinator list` — show current list
- `/lunchinator admin` — returns a link to the web admin panel

### Web Admin Panel
A React single-page app accessible via link from Slack. Features:
- Full restaurant list (name, cuisine, DoorDash link)
- Add / edit / delete restaurants
- **Default order deadline** setting (e.g. 30 minutes) — used as the pre-fill in the modal
- Phase2 brand design (Deep Navy + Cyan, Manrope/Sora)

---

## Architecture

### Components
| Component | Role |
|-----------|------|
| Slack Bolt app (Node.js) | Slash commands, modal handling, Block Kit messages, group DM creation |
| Express API | REST endpoints for admin panel, restaurant CRUD |
| SQLite database | Restaurants table, lunch sessions table (who was invited, what was picked) |
| React + Vite admin panel | Web UI for restaurant management |

### Data Model

**restaurants**
- id, name, cuisine, doordash_url, created_at

**settings**
- key, value (e.g. key: "default_deadline_minutes", value: "30")

**lunch_sessions**
- id, restaurant_id, organizer_slack_id, attendee_slack_ids (JSON), mode (random/manual), deadline_at, slack_message_ts, picked_at

**rsvps**
- id, session_id, slack_user_id, created_at

### Stack
- **Backend:** Node.js + Express + Slack Bolt SDK
- **Database:** SQLite (via better-sqlite3)
- **Frontend:** React + Vite
- **Slack:** Block Kit interactive messages, modals, slash commands

---

## Design System

**Source:** Phase2 Brand Guide (https://phase2interactive.github.io/Phase2_BrandGuides/brand/introduction)

**Colors**
- Background: `#00233A` (Abyss Deep Navy)
- Primary UI: `#1A3B6F` (Blueprint Indigo)
- Accent/CTA: `#16A3D6` (Pulse Cyan)
- Light highlight: `#9AE4FF` (Clarity Ice Blue)
- Coral (danger/remove): `#F5543A`

**Typography**
- Headings: Manrope SemiBold/Bold
- Body/UI: Sora Regular/Medium

**Slack Block Kit** uses native Slack styling — Phase2 brand applies to the web admin panel only.

---

## Out of Scope (Prototype)

- Authentication / SSO for the admin panel (POC: unprotected or single password)
- DoorDash API integration (POC: manually-entered group order URLs)
- Push notifications or reminders
- Order history analytics
- Multi-workspace support
