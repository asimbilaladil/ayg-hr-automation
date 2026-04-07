# AYG HR Automation

Internal HR Recruitment Platform for AYG Foods — monorepo.

## Architecture

```
ayg-hr-automation/
├── backend/          Express API — PORT 3001
│   ├── src/          controllers · routes · services · middleware
│   └── prisma/       schema.prisma
├── frontend/         Next.js 14 App Router — PORT 3000
│   ├── app/          pages · API routes (NextAuth)
│   └── components/   UI · RoleGuard
├── scripts/
│   └── setup.sh      one-command deploy
├── docker-compose.yml
└── .env.example
```

## Quick Start

### 1. Clone & configure

```bash
git clone https://github.com/your-org/ayg-hr-automation.git
cd ayg-hr-automation
cp .env.example .env          # then fill in Azure AD + DB credentials
```

### 2. One-command setup

```bash
bash scripts/setup.sh
```

This installs dependencies, runs DB migrations, builds the backend, and starts both servers.

### 3. Manual (development)

```bash
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — frontend
cd frontend && npm run dev
```

## Authentication

Microsoft Azure AD SSO via NextAuth v5. Only `@aygfoods.com` email addresses may access the platform. See [backend/README.md](backend/README.md) and [frontend/README-AUTH.md](frontend/README-AUTH.md) for full setup.

## Roles

| Role | Access |
|---|---|
| `ADMIN` | Full access — manage users, roles, deactivate accounts |
| `MANAGER` | View candidates, manage pipeline, approve offers |
| `HR` | Default — post jobs, review applications |

## Environment Variables

Copy `.env.example` to `.env` and fill in all values. See the file for descriptions of each variable.
