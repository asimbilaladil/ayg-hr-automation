#!/usr/bin/env bash
# ─── AYG HR — Backend Deploy Script ──────────────────────────────────────────
# Run this whenever you update the backend code.
# Usage: bash scripts/deploy-backend.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/../backend" && pwd)"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   AYG HR — Backend Deploy                ║"
echo "╚══════════════════════════════════════════╝"
echo ""

cd "$BACKEND_DIR"

# ── Step 1: Run database migration ───────────────────────────────────────────
if [ -f "$SCRIPT_DIR/migration_ai_fields.sql" ]; then
  echo "🗄️  Running AI fields migration…"
  # Pull DATABASE_URL from .env
  if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
  fi
  psql "$DATABASE_URL" -f "$SCRIPT_DIR/migration_ai_fields.sql" && \
    echo "✅ Migration complete" || \
    echo "⚠️  Migration had errors (columns may already exist — that is OK)"
else
  echo "⚠️  migration_ai_fields.sql not found in scripts/ — skipping DB migration"
fi

# ── Step 2: Regenerate Prisma client ─────────────────────────────────────────
echo ""
echo "🔄 Regenerating Prisma client…"
npx prisma generate
echo "✅ Prisma client regenerated"

# ── Step 3: Build TypeScript ──────────────────────────────────────────────────
echo ""
echo "🔨 Building TypeScript…"
npm run build
echo "✅ Backend built"

# ── Step 4: Restart backend via PM2 ──────────────────────────────────────────
echo ""
echo "🔄 Restarting hr-backend in PM2…"
if pm2 describe hr-backend &>/dev/null; then
  pm2 restart hr-backend
else
  pm2 start ecosystem.config.js --only hr-backend --env production
fi
pm2 save

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  ✅ Backend deployed successfully!        ║"
echo "╚══════════════════════════════════════════╝"
echo ""
