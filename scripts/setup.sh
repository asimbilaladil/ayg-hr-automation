#!/usr/bin/env bash
# ─── AYG HR Automation — one-command setup & deploy ──────────────────────────
set -euo pipefail

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  AYG HR Recruitment Platform — Setup      ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── 1. Check prerequisites ────────────────────────────────────────────────────
command -v node >/dev/null 2>&1  || { echo "❌ Node.js not found. Install v20+."; exit 1; }
command -v npm  >/dev/null 2>&1  || { echo "❌ npm not found."; exit 1; }

echo "✅ Node $(node -v) / npm $(npm -v)"

# ── 2. Install dependencies ───────────────────────────────────────────────────
echo ""
echo "📦 Installing backend dependencies..."
cd backend && npm install && cd ..

echo "📦 Installing frontend dependencies..."
cd frontend && npm install && cd ..

# ── 3. Environment files ──────────────────────────────────────────────────────
if [ ! -f backend/.env ]; then
  echo ""
  echo "⚠️  backend/.env not found — copying from example."
  cp .env.example backend/.env
fi

if [ ! -f frontend/.env.local ]; then
  echo "⚠️  frontend/.env.local not found — copying from example."
  cp .env.example frontend/.env.local
fi

# ── 4. Database migration ─────────────────────────────────────────────────────
echo ""
echo "🗄️  Running Prisma migrations..."
cd backend && npx prisma migrate deploy && cd ..

# ── 5. Build backend ──────────────────────────────────────────────────────────
echo ""
echo "🔨 Building backend..."
cd backend && npm run build && cd ..

# ── 6. Start backend with PM2 ────────────────────────────────────────────────
echo ""
echo "🚀 Starting backend with PM2..."
cd backend && npx pm2 start ecosystem.config.js && cd ..

# ── 7. Start Next.js frontend ─────────────────────────────────────────────────
echo ""
echo "🌐 Starting Next.js frontend..."
cd frontend && npm run build && npm run start &

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  ✅ Setup complete!                        ║"
echo "║  Backend:  http://localhost:3001           ║"
echo "║  Frontend: http://localhost:3000           ║"
echo "╚══════════════════════════════════════════╝"
echo ""
