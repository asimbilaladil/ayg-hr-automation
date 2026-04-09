#!/usr/bin/env bash
# ─── AYG HR Automation — one-command setup & deploy ──────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  AYG HR Recruitment Platform — Setup      ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── 1. Check prerequisites ────────────────────────────────────────────────────
command -v node >/dev/null 2>&1 || { echo "❌ Node.js not found. Install v20+."; exit 1; }
command -v npm  >/dev/null 2>&1 || { echo "❌ npm not found."; exit 1; }
command -v pm2  >/dev/null 2>&1 || { echo "📦 Installing PM2 globally…"; npm install -g pm2; }

echo "✅ Node $(node -v) / npm $(npm -v) / PM2 $(pm2 --version)"

# ── 2. Install 'serve' for Vue static hosting ─────────────────────────────────
if ! command -v serve &>/dev/null; then
  echo "📦 Installing 'serve' globally…"
  npm install -g serve
fi

# ── 3. Install backend dependencies ──────────────────────────────────────────
echo ""
echo "📦 Installing backend dependencies…"
cd "$ROOT_DIR/backend" && npm install

# ── 4. Install frontend dependencies ─────────────────────────────────────────
echo ""
echo "📦 Installing frontend dependencies…"
cd "$ROOT_DIR/frontend" && npm install

# ── 5. Environment files ──────────────────────────────────────────────────────
echo ""
if [ ! -f "$ROOT_DIR/backend/.env" ]; then
  echo "⚠️  backend/.env not found — copying from example."
  cp "$ROOT_DIR/backend/.env.example" "$ROOT_DIR/backend/.env"
  echo "   ➡️  Edit backend/.env with your real values before continuing."
fi

# frontend/.env.production is committed and ready — no user action needed.
echo "✅ Environment files ready."

# ── 6. Database migration ─────────────────────────────────────────────────────
echo ""
echo "🗄️  Running Prisma migrations…"
cd "$ROOT_DIR/backend" && npx prisma migrate deploy

# ── 7. Build backend ──────────────────────────────────────────────────────────
echo ""
echo "🔨 Building backend…"
cd "$ROOT_DIR/backend" && npm run build

# ── 8. Build Vue frontend ─────────────────────────────────────────────────────
echo ""
echo "🔨 Building Vue frontend…"
cd "$ROOT_DIR/frontend" && npm run build
echo "✅ Vue build complete → frontend/dist/"

# ── 9. Start/restart all processes with PM2 ──────────────────────────────────
echo ""
echo "🚀 Starting all processes with PM2…"
cd "$ROOT_DIR/backend"

pm2 delete hr-backend  2>/dev/null || true
pm2 delete hr-frontend 2>/dev/null || true

pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup 2>/dev/null || true   # register auto-start on server reboot

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  ✅ Setup complete!                        ║"
echo "║  Backend:  http://localhost:3001           ║"
echo "║  Frontend: http://localhost:3000           ║"
echo "║  Public:   https://hr.aygfoods.com        ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "Next: configure Nginx (see scripts/nginx-hr.conf)"
echo "Then: sudo nginx -t && sudo systemctl reload nginx"
