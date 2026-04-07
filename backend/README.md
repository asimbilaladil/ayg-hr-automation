# HR Recruitment System — Backend

Node.js + TypeScript + Express + PostgreSQL (Prisma) backend for the internal HR recruitment system. Replaces Google Sheets + Excel workflows.

---

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- pm2 (`npm install -g pm2`)

---

## Setup

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in:
- `DATABASE_URL` — your PostgreSQL connection string
- `AZURE_TENANT_ID` / `AZURE_CLIENT_ID` / `AZURE_JWKS_URI` — from Azure Portal → App Registration
- `N8N_API_KEY` — generate with `openssl rand -hex 32`
- `FRONTEND_URL` — URL of the frontend app (for CORS)

### 3. Run database migrations

```bash
npx prisma migrate dev --name init
```

For production:

```bash
npx prisma migrate deploy
```

### 4. Generate Prisma client

```bash
npx prisma generate
```

### 5. Build

```bash
npm run build
```

### 6. Start with pm2

```bash
mkdir -p logs
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup   # follow the printed command to enable autostart
```

### Development mode

```bash
npm run dev
```

---

## API Docs

Available at: `http://localhost:3001/api/docs`

Raw OpenAPI JSON: `http://localhost:3001/api/docs.json`

---

## Auth

Two methods:

| Method | Header | Used by |
|--------|--------|---------|
| Azure AD JWT | `Authorization: Bearer <token>` | Frontend users |
| API Key | `X-API-Key: <N8N_API_KEY>` | n8n workflows, Vapi |

Users are auto-provisioned on first Azure AD login with role `HR`. An ADMIN must manually promote them if needed.

---

## Roles

| Role | Capabilities |
|------|-------------|
| `ADMIN` | Full access including delete and user management |
| `MANAGER` | Read candidates, manage availability and appointments |
| `HR` | Read/edit candidates, read availability and appointments |

Role hierarchy: `ADMIN > MANAGER > HR` — higher roles inherit lower role permissions.

---

## n8n Migration Guide

Replace all Google Sheets nodes with HTTP Request nodes pointing to this API.

| Old n8n Action | New API Call |
|---|---|
| Google Sheets — append candidate | `POST /api/candidates` + body |
| Google Sheets — read pending candidates | `GET /api/candidates?status=pending&limit=100` |
| Google Sheets — update AI review | `PATCH /api/candidates/{emailId}/ai-review` |
| Google Sheets — read availability | `GET /api/availability?location=X&dayOfWeek=Y` |
| Google Sheets — read booked slots | `GET /api/appointments?location=X&date=YYYY-MM-DD` |
| Google Sheets — write booking | `POST /api/appointments` |
| Google Sheets — update transcript | `PATCH /api/candidates/{emailId}/call-result` |
| Google Sheets — read all candidates | `GET /api/candidates?limit=9999` |
| Google Sheets — reset problematic | `POST /api/candidates/reset-problematic` |
| Vapi — get free slots | `GET /api/availability/slots?location=X&dayOfWeek=Y&date=YYYY-MM-DD` |

**n8n HTTP Request node setup:**
- Authentication: `Header Auth`
- Header name: `X-API-Key`
- Header value: `{{ $env.N8N_API_KEY }}`

---

## Important Notes

1. **Resume files** at `/root/.n8n-files/resumes/` are NOT touched by this backend. The AI review workflow reads them directly.
2. **emailId** is the unique Gmail message ID (e.g. `19c8cd9c4505a04f`) — always match/update candidates by this field from n8n.
3. **Slot duration** is hardcoded at 20 minutes in the slot calculation logic.
4. **Soft deletes** — candidates are never hard-deleted. A `deletedAt` timestamp is set instead.
5. **Timezone** — use `Europe/Berlin` in n8n workflows for date calculations (matching existing Vapi logic).

---

## Project Structure

```
backend/
├── prisma/
│   └── schema.prisma          # DB models
├── src/
│   ├── index.ts               # Express app + server
│   ├── config/env.ts          # Zod-validated env vars
│   ├── lib/prisma.ts          # Prisma singleton
│   ├── middleware/
│   │   ├── auth.ts            # JWT + API Key auth
│   │   ├── rbac.ts            # Role-based access
│   │   └── errorHandler.ts
│   ├── routes/                # Express routers
│   ├── controllers/           # Request/response handling
│   ├── services/              # Business logic + DB queries
│   ├── schemas/               # Zod input validation schemas
│   └── swagger/setup.ts       # OpenAPI docs
├── .env.example
├── ecosystem.config.js        # pm2 config
├── package.json
└── tsconfig.json
```

---

## Common Commands

```bash
# View logs
pm2 logs hr-backend

# Restart after code change
npm run build && pm2 restart hr-backend

# Check status
pm2 status

# Open Prisma Studio (DB browser)
npx prisma studio

# Run a migration in production
npx prisma migrate deploy && pm2 restart hr-backend
```
