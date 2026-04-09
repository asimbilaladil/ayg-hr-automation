#!/usr/bin/env bash
# ─── AYG HR — Frontend Deploy Script ─────────────────────────────────────────
# Run this whenever you update the Vue frontend.
# Usage: bash scripts/deploy-frontend.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

FRONTEND_DIR="$(cd "$(dirname "$0")/../frontend" && pwd)"
BACKEND_DIR="$(cd "$(dirname "$0")/../backend" && pwd)"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   AYG HR — Vue Frontend Deploy           ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── Step 1: Ensure 'serve' is installed globally ─────────────────────────────
echo "🔍 Checking for 'serve' (static file server)…"
if ! command -v serve &>/dev/null; then
  echo "📦 Installing 'serve' globally…"
  npm install -g serve
else
  echo "✅ 'serve' is already installed ($(serve --version 2>/dev/null || echo 'ok'))"
fi

# ── Step 2: Install frontend dependencies ────────────────────────────────────
echo ""
echo "📦 Installing frontend dependencies…"
cd "$FRONTEND_DIR"
npm install

# ── Step 3: Build Vue app (uses .env.production automatically) ───────────────
echo ""
echo "🔨 Building Vue app for production…"
npm run build

echo "✅ Build complete → $FRONTEND_DIR/dist/"

# ── Step 4: Stop old hr-frontend PM2 process (if running) ────────────────────
echo ""
echo "🔄 Restarting hr-frontend in PM2…"
cd "$BACKEND_DIR"

if pm2 describe hr-frontend &>/dev/null; then
  pm2 delete hr-frontend
  echo "   Stopped old hr-frontend process"
fi

# ── Step 5: Start frontend via PM2 serve ─────────────────────────────────────
# 'serve -s dist -l 3000' serves all routes to index.html (SPA mode)
pm2 start ecosystem.config.js --only hr-frontend --env production
pm2 save

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  ✅ Frontend deployed successfully!       ║"
echo "║  Running at: http://localhost:3000        ║"
echo "║  Public URL: https://hr.aygfoods.com     ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "Useful commands:"
echo "  pm2 logs hr-frontend     # view logs"
echo "  pm2 status               # check process status"
