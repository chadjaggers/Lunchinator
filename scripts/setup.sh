#!/usr/bin/env bash
set -e

echo ""
echo "🍽️  Lunchinator Setup"
echo "================================"
echo ""

# Check Node.js
if ! command -v node &>/dev/null; then
  echo "❌ Node.js not found. Install Node.js 20+ from https://nodejs.org and re-run this script."
  exit 1
fi

NODE_MAJOR=$(node --version | sed 's/v//' | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "❌ Node.js 20+ required (found $(node --version)). Update at https://nodejs.org"
  exit 1
fi

echo "✅ Node.js $(node --version) found"

# Install server dependencies
echo ""
echo "📦 Installing server dependencies..."
npm install --silent

# Install + build client
echo "📦 Installing client dependencies..."
cd client && npm install --silent

echo "🏗️  Building admin panel..."
npm run build --silent
cd ..

echo "✅ Build complete"

# .env setup
echo ""
if [ -f .env ]; then
  echo "✅ .env already exists — skipping"
else
  cp .env.example .env
  echo "📝 Created .env from .env.example"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔑 Next: Fill in your Slack credentials"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Open .env and set:"
echo "  SLACK_BOT_TOKEN      — from Slack app OAuth & Permissions page"
echo "  SLACK_SIGNING_SECRET — from Slack app Basic Information page"
echo "  SLACK_APP_TOKEN      — App-Level Token (connections:write scope)"
echo ""
echo "Haven't created a Slack app yet? See Task 10 in:"
echo "  docs/superpowers/plans/2026-05-13-lunchinator.md"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Once .env is filled in, start with:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  npm start"
echo ""
echo "  Admin panel: http://localhost:3000"
echo ""
