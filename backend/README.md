# HR Recruitment System — Backend

Node.js + TypeScript + Express + PostgreSQL (Prisma) backend for the internal HR recruitment system. Replaces Google Sheets + Excel workflows.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Database Migration](#database-migration)
- [API Documentation](#api-docs)
- [Authentication](#auth)
- [Roles & Permissions](#roles)
- [API Endpoints Overview](#api-endpoints-overview)
- [n8n Migration Guide](#n8n-migration-guide)
- [Project Structure](#project-structure)
- [Common Commands](#common-commands)
- [Important Notes](#important-notes)

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

```env
# ─── Database ──────────────────────────────────────────────────────────
DATABASE_URL="postgresql://user:password@localhost:5432/hr_system"

# ─── Auth ──────────────────────────────────────────────────────────────
# Generate with: openssl rand -hex 32
JWT_SECRET=generate-with-openssl-rand-hex-32-min-32-chars
ORG_EMAIL_DOMAIN=aygfoods.com

# ─── n8n / Vapi API Key ────────────────────────────────────────────────
# Generate with: openssl rand -hex 32
N8N_API_KEY=generate-a-long-random-secret-here-min-32-chars

# ─── App ───────────────────────────────────────────────────────────────
PORT=3001
NODE_ENV=production
FRONTEND_URL=http://localhost:3000
```

**Required fields:**
- `DATABASE_URL` — your PostgreSQL connection string
- `JWT_SECRET` — minimum 32 characters (generate with `openssl rand -hex 32`)
- `ORG_EMAIL_DOMAIN` — your organization's email domain (e.g., `aygfoods.com`)
- `N8N_API_KEY` — minimum 32 characters (generate with `openssl rand -hex 32`)
- `FRONTEND_URL` — URL of the frontend app (for CORS)

### 3. Run database migrations

For development:

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

### 5. Seed the database

Seed admin user:

```bash
npm run prisma:seed
```

This creates a single admin user with full system access.

**Default admin credentials:**
- Email: `admin@aygfoods.com`
- Password: `ChangeMe123!`

⚠️ **Change the admin password immediately after first login!**

Other users (managers, HR staff) will be auto-created when:
- They log in via Azure AD (auto-provisioned as HR role)
- Candidates are imported from n8n with new manager/recruiter names
- Availability windows are created with new manager names

Admins can then promote users to MANAGER or ADMIN roles via the `/api/users/{id}/role` endpoint.

### 6. Build

```bash
npm run build
```

### 7. Start with pm2

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

## Database Migration

### Initial Setup (New Database)

If starting fresh:

```bash
# Run migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Seed test data
npm run prisma:seed
```

### Migrating Existing Data (Google Sheets → PostgreSQL)

If you have existing data in Google Sheets that was previously imported:

**Step 1:** Run the SQL migration to add relational structure:

```bash
psql $DATABASE_URL -f migration.sql
```

**Step 2:** Run the data migration script:

```bash
node migrate-data-simple.js
```

This will:
- Create `Location` records from unique candidate locations
- Create `User` records for hiring managers and recruiters
- Link existing `Candidate`, `ManagerAvailability`, and `Appointment` records to the new relational structure
- Preserve all existing text fields for backward compatibility

**Step 3:** Verify the migration:

```bash
# Open Prisma Studio to inspect data
npx prisma studio
```

**Step 4 (Optional):** After thorough verification, you can remove the redundant text columns. This is commented out in `migration.sql` for safety.

---

## API Docs

Interactive Swagger documentation available at:

**Swagger UI:** `http://localhost:3001/api/docs`

**OpenAPI JSON:** `http://localhost:3001/api/docs.json`

The Swagger docs include:
- All endpoints with request/response schemas
- Authentication requirements
- Try-it-out functionality
- n8n migration examples

---

## Auth

Two authentication methods are supported:

| Method | Header | Used by | Notes |
|--------|--------|---------|-------|
| Azure AD JWT | `Authorization: Bearer <token>` | Frontend users | Standard JWT authentication |
| API Key | `X-API-Key: <N8N_API_KEY>` | n8n workflows, Vapi | Static key from `.env` |

### User Provisioning

Users are auto-provisioned on first login via Azure AD with default role `HR`. 

An `ADMIN` must manually promote users to `MANAGER` or `ADMIN` roles using:
- `PATCH /api/users/{id}/role` endpoint
- Or directly via Prisma Studio

### Email Domain Restriction

Only emails from your organization's domain (set in `ORG_EMAIL_DOMAIN`) can log in. Attempts from other domains are rejected with 403.

---

## Roles

| Role | Capabilities |
|------|-------------|
| `ADMIN` | Full access including delete operations, user management, and location management |
| `MANAGER` | Read candidates, full CRUD on availability and appointments, manage own schedules |
| `HR` | Read/edit candidates, read availability and appointments |

**Role hierarchy:** `ADMIN > MANAGER > HR` 

Higher roles inherit all permissions from lower roles.

### Permission Matrix

| Action | ADMIN | MANAGER | HR | n8n API |
|--------|-------|---------|----|----|
| View candidates | ✅ | ✅ | ✅ | ✅ |
| Edit candidates | ✅ | ✅ | ✅ | ✅ (via API key) |
| Delete candidates | ✅ | ❌ | ❌ | ❌ |
| View appointments | ✅ | ✅ | ✅ | ✅ |
| Create appointments | ✅ | ✅ | ❌ | ✅ (via API key) |
| Edit/Cancel appointments | ✅ | ✅ | ❌ | ❌ |
| View availability | ✅ | ✅ | ✅ | ✅ |
| Manage availability | ✅ | ✅ | ❌ | ❌ |
| Manage users | ✅ | ❌ | ❌ | ❌ |
| Manage locations | ✅ | ❌ | ❌ | ❌ |

---

## API Endpoints Overview

### Candidates

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/candidates` | JWT (HR+) | List candidates with filters & pagination |
| GET | `/api/candidates/:id` | JWT (HR+) | Get candidate by database ID |
| GET | `/api/candidates/by-email/:emailId` | API Key | Get candidate by Gmail emailId (n8n) |
| POST | `/api/candidates` | API Key | Create new candidate (n8n) |
| PATCH | `/api/candidates/:id` | JWT (HR+) | Update candidate (manual edit) |
| PATCH | `/api/candidates/:emailId/ai-review` | API Key | Update AI review results (n8n) |
| PATCH | `/api/candidates/:emailId/call-result` | API Key | Update call transcript (n8n/Vapi) |
| PATCH | `/api/candidates/:emailId/status` | API Key | Update candidate status (n8n) |
| POST | `/api/candidates/reset-problematic` | API Key | Reset stuck candidates to pending (n8n) |
| DELETE | `/api/candidates/:id` | JWT (ADMIN) | Soft-delete candidate |

### Appointments

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/appointments` | JWT (HR+) | List appointments with filters |
| GET | `/api/appointments/:id` | JWT (HR+) | Get appointment by ID |
| POST | `/api/appointments` | API Key | Book appointment (n8n/Vapi) |
| PATCH | `/api/appointments/:id` | JWT (MANAGER+) | Update appointment |
| DELETE | `/api/appointments/:id` | JWT (MANAGER+) | Cancel appointment (soft delete) |

### Availability

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/availability` | JWT (HR+) | List availability windows |
| GET | `/api/availability/:id` | JWT (MANAGER+) | Get single availability window |
| GET | `/api/availability/slots` | API Key | Get available time slots for booking (n8n/Vapi) |
| GET | `/api/availability/suggestions` | API Key | Get suggested slots for next 10 days (Vapi) |
| GET | `/api/availability/validate` | API Key | Validate if a specific slot is available (Vapi) |
| POST | `/api/availability` | JWT (MANAGER+) | Create availability window |
| PATCH | `/api/availability/:id` | JWT (MANAGER+) | Update availability window |
| DELETE | `/api/availability/:id` | JWT (MANAGER+) | Delete availability window |

### Locations

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/locations` | JWT (ADMIN) | List all locations with usage counts |
| GET | `/api/locations/:id` | JWT (ADMIN) | Get location by ID |
| POST | `/api/locations` | JWT (ADMIN) | Create new location |
| PATCH | `/api/locations/:id` | JWT (ADMIN) | Update location |
| DELETE | `/api/locations/:id` | JWT (ADMIN) | Delete location (only if not in use) |

### Users

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/users/me` | JWT | Get current user info |
| GET | `/api/users` | JWT (ADMIN) | List all users |
| PATCH | `/api/users/:id/role` | JWT (ADMIN) | Change user role |
| PATCH | `/api/users/:id/deactivate` | JWT (ADMIN) | Deactivate user |

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | None | Login with email/password |

### Health

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | None | Health check endpoint |

---

## n8n Migration Guide

Replace all Google Sheets nodes with HTTP Request nodes pointing to this API.

### HTTP Request Node Setup

**Authentication:**
- Type: `Header Auth`
- Header name: `X-API-Key`
- Header value: `{{ $env.N8N_API_KEY }}`

### Migration Table

| Old n8n Action | New API Call | Method | Endpoint |
|---|---|---|---|
| Google Sheets — append candidate | API Request | POST | `/api/candidates` |
| Google Sheets — read pending candidates | API Request | GET | `/api/candidates?status=pending&limit=100` |
| Google Sheets — update AI review | API Request | PATCH | `/api/candidates/{emailId}/ai-review` |
| Google Sheets — read availability | API Request | GET | `/api/availability?location=X&dayOfWeek=Y` |
| Google Sheets — read booked slots | API Request | GET | `/api/appointments?location=X&date=YYYY-MM-DD` |
| Google Sheets — write booking | API Request | POST | `/api/appointments` |
| Google Sheets — update transcript | API Request | PATCH | `/api/candidates/{emailId}/call-result` |
| Google Sheets — read all candidates | API Request | GET | `/api/candidates?limit=9999` |
| Google Sheets — reset problematic | API Request | POST | `/api/candidates/reset-problematic` |
| Google Sheets — update status | API Request | PATCH | `/api/candidates/{emailId}/status` |
| Vapi — get free slots | API Request | GET | `/api/availability/slots?location=X&dayOfWeek=Y&date=YYYY-MM-DD` |
| Vapi — get suggestions | API Request | GET | `/api/availability/suggestions?location=X` |
| Vapi — validate slot | API Request | GET | `/api/availability/validate?location=X&date=Y&time=Z` |

### Example: Create Candidate

```json
POST /api/candidates
Headers: { "X-API-Key": "your-api-key" }
Body: {
  "postingName": "LCF Cashier",
  "location": "LCF Airtex",
  "candidateName": "John Smith",
  "phone": "5551234567",
  "dateApplied": "23 Feb 2026",
  "hiringManager": "Emerson Medrano",
  "recruiter": "Sarah Johnson",
  "status": "pending",
  "emailId": "19c8cd9c4505a04f"
}
```

### Example: Update AI Review

```json
PATCH /api/candidates/19c8cd9c4505a04f/ai-review
Headers: { "X-API-Key": "your-api-key" }
Body: {
  "aiScore": 85,
  "aiRecommendation": "HIRE",
  "aiCriteriaMet": "2+ years experience, great communication",
  "aiCriteriaMissing": "No management experience",
  "aiSummary": "Strong candidate with relevant experience",
  "status": "reviewed",
  "reviewedAt": "2026-04-16T10:30:00Z",
  "candidateName": "John Smith",
  "phone": "5551234567"
}
```

### Example: Get Available Slots

```json
GET /api/availability/slots?location=LCF%20Airtex&dayOfWeek=Monday&date=2026-04-21
Headers: { "X-API-Key": "your-api-key" }

Response: {
  "slots": [
    {
      "date": "2026-04-21",
      "day": "Monday",
      "startTime": "09:00",
      "endTime": "09:20",
      "displayTime": "9:00 AM",
      "managerName": "Tom",
      "managerEmail": "tom@aygfoods.com",
      "location": "LCF Airtex"
    },
    {
      "date": "2026-04-21",
      "day": "Monday",
      "startTime": "09:20",
      "endTime": "09:40",
      "displayTime": "9:20 AM",
      "managerName": "Tom",
      "managerEmail": "tom@aygfoods.com",
      "location": "LCF Airtex"
    }
  ]
}
```

### Example: Book Appointment

```json
POST /api/appointments
Headers: { "X-API-Key": "your-api-key" }
Body: {
  "location": "LCF Airtex",
  "managerName": "Tom",
  "managerEmail": "tom@aygfoods.com",
  "candidateName": "John Smith",
  "jobRole": "Cashier",
  "interviewDate": "2026-04-21",
  "day": "Monday",
  "startTime": "09:00",
  "endTime": "09:20",
  "slotDuration": "20 min"
}
```

---

## Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma          # Database models and relations
│   └── seed.ts                # Database seeding script
├── src/
│   ├── index.ts               # Express app + server startup
│   ├── config/
│   │   └── env.ts             # Zod-validated environment variables
│   ├── lib/
│   │   └── prisma.ts          # Prisma singleton client
│   ├── middleware/
│   │   ├── auth.ts            # JWT + API Key authentication
│   │   ├── rbac.ts            # Role-based access control
│   │   └── errorHandler.ts   # Global error handling
│   ├── routes/                # Express route definitions
│   │   ├── auth.ts
│   │   ├── candidates.ts
│   │   ├── appointments.ts
│   │   ├── availability.ts
│   │   ├── locations.routes.ts
│   │   └── users.ts
│   ├── controllers/           # Request/response handling
│   │   ├── auth.controller.ts
│   │   ├── candidates.controller.ts
│   │   ├── appointments.controller.ts
│   │   ├── availability.controller.ts
│   │   ├── locations.controller.ts
│   │   └── users.controller.ts
│   ├── services/              # Business logic + DB queries
│   │   ├── candidates.service.ts
│   │   ├── appointments.service.ts
│   │   ├── availability.service.ts
│   │   ├── locations.service.ts
│   │   └── users.service.ts
│   ├── schemas/               # Zod input validation schemas
│   │   ├── candidate.schema.ts
│   │   ├── appointment.schema.ts
│   │   ├── availability.schema.ts
│   │   └── location.schema.ts
│   └── swagger/
│       └── setup.ts           # OpenAPI/Swagger documentation
├── .env.example               # Environment variables template
├── ecosystem.config.js        # pm2 configuration
├── migration.sql              # SQL migration for relational structure
├── migrate-data-simple.js     # Data migration script
├── package.json
└── tsconfig.json
```

---

## Common Commands

### Development

```bash
# Start development server with hot reload
npm run dev

# Run type checking
npx tsc --noEmit

# View database in browser
npx prisma studio
```

### Production

```bash
# Build TypeScript
npm run build

# Start with pm2
pm2 start ecosystem.config.js --env production

# View logs
pm2 logs hr-backend

# Restart after code changes
npm run build && pm2 restart hr-backend

# Check status
pm2 status

# Stop all
pm2 stop all

# Delete from pm2 list
pm2 delete hr-backend
```

### Database

```bash
# Generate Prisma client after schema changes
npx prisma generate

# Create and apply new migration
npx prisma migrate dev --name migration_name

# Apply pending migrations (production)
npx prisma migrate deploy

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Seed database
npm run prisma:seed

# Open Prisma Studio (database browser)
npx prisma studio
```

### Debugging

```bash
# View backend logs
pm2 logs hr-backend

# View backend errors only
pm2 logs hr-backend --err

# Clear logs
pm2 flush

# Monitor resources
pm2 monit
```

---

## Important Notes

### 1. Resume Files

Resume files stored at `/root/.n8n-files/resumes/` are **NOT** touched by this backend. The AI review workflow reads them directly from the filesystem.

The backend only stores the `resumeUrl` field pointing to these files.

### 2. emailId Field

`emailId` is the unique Gmail message ID (e.g., `19c8cd9c4505a04f`). This is used as the primary identifier for n8n workflows.

**Always** match/update candidates by this field when integrating with n8n, not by database ID.

### 3. Slot Duration

Slot duration is hardcoded at **20 minutes** in the slot calculation logic (`availability.service.ts`).

This can be customized per availability window via the `slotDuration` field, but defaults to "20 Min".

### 4. Soft Deletes

Candidates are **never hard-deleted**. Instead, a `deletedAt` timestamp is set.

Soft-deleted candidates are excluded from all queries by default (`deletedAt: null` filter).

To permanently delete, you must do it manually via SQL or Prisma Studio.

### 5. Timezone

Use **`America/Chicago`** (Central Time) in n8n workflows for date calculations.

This matches the existing Vapi logic and ensures consistent slot calculation across the system.

The backend uses this timezone in `availability.service.ts` for slot generation.

### 6. Location & Manager Auto-Creation

The system automatically creates `Location` and `User` records when:
- A candidate is created with a new location name
- A candidate is created with a new hiring manager or recruiter name
- An availability window is created with a new location or manager

Placeholder users are created with temporary emails like `name@temp.placeholder` and can be updated by admins later.

### 7. Relational vs Text Fields

The database schema maintains **both** relational foreign keys AND text fields for backward compatibility:

- `locationId` + `location` (text)
- `managerId` + `managerName` + `managerEmail` (text)
- `hiringManagerId` + `hiringManager` (text)
- `recruiterId` + `recruiter` (text)

This allows:
- n8n workflows to continue using text-based fields
- Frontend to use rich relational data
- Gradual migration without breaking existing integrations

After full migration, the text fields can be removed if desired.

### 8. CORS Configuration

The backend is configured to accept requests from `FRONTEND_URL` only.

If deploying to production, update this in `.env` to match your production frontend URL.

### 9. API Rate Limiting

Currently, there is **no rate limiting** on API endpoints.

For production deployments with public exposure, consider adding rate limiting middleware.

### 10. Password Security

- All passwords are hashed with bcrypt (12 rounds)
- JWT tokens expire after 8 hours
- API keys should be at least 32 characters
- Change all default passwords immediately after deployment

---

## Troubleshooting

### "Invalid environment variables" error

Make sure all required fields in `.env` are filled:
- `DATABASE_URL` must be a valid PostgreSQL connection string
- `JWT_SECRET` must be at least 32 characters
- `N8N_API_KEY` must be at least 16 characters (recommend 32+)
- `ORG_EMAIL_DOMAIN` must be set to your organization's domain

### "Database connection failed"

Check:
1. PostgreSQL is running: `systemctl status postgresql`
2. Database exists: `psql -l | grep hr_system`
3. Connection string in `.env` is correct
4. User has proper permissions

### "Port already in use"

Another process is using port 3001. Either:
- Kill the existing process: `lsof -ti:3001 | xargs kill -9`
- Change `PORT` in `.env` to a different port

### Build errors after schema changes

```bash
# Regenerate Prisma client
npx prisma generate

# Rebuild TypeScript
npm run build
```

### n8n workflows returning 401

Check:
1. `X-API-Key` header is set in n8n HTTP Request node
2. API key matches `N8N_API_KEY` in backend `.env`
3. API key has no extra spaces or quotes

---

## Security Checklist

Before deploying to production:

- [ ] Change all default passwords
- [ ] Generate strong `JWT_SECRET` (32+ chars)
- [ ] Generate strong `N8N_API_KEY` (32+ chars)
- [ ] Set correct `ORG_EMAIL_DOMAIN`
- [ ] Set production `FRONTEND_URL`
- [ ] Enable HTTPS/TLS
- [ ] Set `NODE_ENV=production`
- [ ] Review CORS settings
- [ ] Restrict database user permissions
- [ ] Enable firewall rules
- [ ] Set up automated backups
- [ ] Review and test all role permissions
- [ ] Enable pm2 log rotation
- [ ] Set up monitoring and alerts

---

## Support

For issues or questions:
1. Check the logs: `pm2 logs hr-backend`
2. Review Swagger docs: `http://localhost:3001/api/docs`
3. Inspect database: `npx prisma studio`
4. Check migrations: `npx prisma migrate status`

---

## License

Internal use only — AYG Foods HR System
