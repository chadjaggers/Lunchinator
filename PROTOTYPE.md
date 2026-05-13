# PROTOTYPE.md

## Project: Phase2 — Lunchinator
**Stack:** Node.js + Slack Bolt + Express + SQLite + React + Vite
**Demo date:** TBD

---

## 2026-05-13 — Kickoff
- Brief: A Slack bot that randomizes or lets organizers pick a lunch restaurant, notifies a selected group via group DM with a DoorDash group order link and countdown timer
- Stack: Node.js + Slack Bolt SDK + Express + SQLite (better-sqlite3) + React + Vite + Tailwind CSS
- Features planned: 9 (Scaffold, Database, Block Kit Card, REST API, Slash Commands, Modal + Group DM, RSVP/Spin Again, Deadline Scheduler, React Admin Panel)
- Slack App Setup (Task 10) is a manual step — see docs/superpowers/plans/2026-05-13-lunchinator.md

## 2026-05-13 — Implementation Complete
- All 9 code tasks implemented and reviewed
- 17 tests passing (db, messages, API)
- React admin panel built and serving from Express
- POC shortcuts: admin panel has no auth, DoorDash group order URLs are manually entered
