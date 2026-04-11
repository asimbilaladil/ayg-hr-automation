# AYG HR Automation — Full Handover Document

**Project:** AYG HR Recruitment Platform
**Company:** AYG Foods
**Server IP:** `46.62.166.147`
**Git Repo:** https://github.com/asimilaladil/ayg-hr-automation
**Branch:** `master`
**Last Updated:** April 9, 2026

---

## Table of Contents

1. [What Was Built](#1-what-was-built)
2. [Tech Stack](#2-tech-stack)
3. [Repository File Structure](#3-repository-file-structure)
4. [How the Backend Works](#4-how-the-backend-works)
5. [How the Frontend Works](#5-how-the-frontend-works)
6. [Database Schema](#6-database-schema)
7. [Authentication & Security](#7-authentication--security)
8. [n8n Integration — How It Works](#8-n8n-integration--how-it-works)
9. [Server Setup & Deployment Architecture](#9-server-setup--deployment-architecture)
10. [Environment Variables](#10-environment-variables)
11. [Nginx Configuration](#11-nginx-configuration)
12. [PM2 Process Manager](#12-pm2-process-manager)
13. [How to Deploy / Update](#13-how-to-deploy--update)
14. [API Reference](#14-api-reference)
15. [Role-Based Access Control](#15-role-based-access-control)
16. [Candidate Status Lifecycle](#16-candidate-status-lifecycle)
17. [Slot & Appointment Logic](#17-slot--appointment-logic)
18. [User Management](#18-user-management)
19. [Troubleshooting](#19-troubleshooting)
20. [Security Checklist](#20-security-checklist)

---

## 1. What Was Built

A complete internal HR Recruitment Platform that **replaces the previous Google Sheets + Excel + manual email workflow**. It has three layers:

| Layer | Technology | Public Domain | Internal Port |
|---|---|---|---|
| Frontend (SPA) | Vue 3 + Vite | https://hr.aygfoods.com | 3000 |
| Backend API | Express.js + TypeScript + Prisma | https://hr-api.aygfoods.com | 3001 |
| Database | PostgreSQL 16 | localhost only (no public access) | 5432 |
| Automation | n8n (pre-existing, separate install) | — | 5678 |

### What the platform does

- **Candidate pipeline**: Track every job applicant from application receipt through AI review, phone screening, and interview scheduling.
- **AI scoring**: n8n feeds AI-generated scores, recommendations, criteria met/missing, and summaries back into each candidate record via API.
- **Phone call integration**: Vapi (AI phone caller) posts call transcripts and outcomes back to candidate records via the same API.
- **Appointment scheduling**: n8n books interview slots based on manager availability windows. The slot engine calculates free 20-minute slots in real time.
- **Manager availability**: Managers set their weekly availability windows (day, start/end time per location). The system generates bookable slots dynamically.
- **Role-based access**: Three roles (ADMIN, MANAGER, HR) with cascading permissions.
- **User management**: Admins create, deactivate, and change roles for org users.

---

## 2. Tech Stack

### Backend
| Package | Purpose |
|---|---|
| `express` | HTTP server framework |
| `typescript` | Type-safe development |
| `prisma` | ORM — database migrations and queries |
| `@prisma/client` | Auto-generated DB client from schema |
| `zod` | Runtime request validation (schemas) |
| `jose` | JWT signing and verification (HS256) |
| `bcryptjs` | Password hashing (12 salt rounds) |
| `helmet` | HTTP security headers |
| `cors` | Cross-origin request control |
| `morgan` | HTTP request logging |
| `swagger-ui-express` | Interactive API docs at `/api/docs` |

### Frontend
| Package | Purpose |
|---|---|
| `vue` v3 | UI framework (Composition API) |
| `vite` | Dev server and production bundler |
| `pinia` | State management (auth store) |
| `vue-router` v4 | Client-side SPA routing |
| `axios` | HTTP requests to backend API |
| `tailwindcss` | Utility-first CSS framework |

### Infrastructure
| Tool | Purpose |
|---|---|
| PM2 | Process manager — keeps backend and frontend running, auto-restarts on crash, survives server reboots |
| Nginx | Reverse proxy — routes public HTTPS traffic to internal PM2 processes |
| Let's Encrypt (certbot) | SSL certificates — auto-renews every 90 days |
| UFW | Linux firewall — blocks direct access to ports 3000 and 3001 |
| PostgreSQL 16 | Relational database |

---

## 3. Repository File Structure

```
ayg-hr-automation/
│
├── HANDOVER.md                      ← This document
├── README.md                        ← Quick start
├── docker-compose.yml               ← Docker setup (alternative to PM2, for local dev)
├── package.json                     ← Root-level convenience scripts
├── .gitignore
│
├── backend/                         ← Express API server
│   ├── package.json                 ← Backend dependencies and npm scripts
│   ├── tsconfig.json                ← TypeScript compiler config
│   ├── ecosystem.config.js          ← PM2 configuration for both processes
│   ├── .env.example                 ← Template for backend environment variables
│   │
│   ├── prisma/
│   │   ├── schema.prisma            ← Database schema (single source of truth)
│   │   └── seed.ts                  ← Script to create initial admin/manager/HR users
│   │
│   └── src/
│       ├── index.ts                 ← App entry point — wires together all middleware and routes
│       │
│       ├── config/
│       │   └── env.ts               ← Validates all required env vars at startup (fail-fast with Zod)
│       │
│       ├── lib/
│       │   └── prisma.ts            ← Single shared Prisma client instance
│       │
│       ├── middleware/
│       │   ├── auth.ts              ← JWT Bearer + X-API-Key authentication
│       │   ├── rbac.ts              ← Role-based access control (ADMIN > MANAGER > HR)
│       │   └── errorHandler.ts      ← Central error handler (Zod, Prisma, generic errors)
│       │
│       ├── routes/
│       │   ├── auth.ts              ← POST /api/auth/login
│       │   ├── candidates.ts        ← /api/candidates (frontend + n8n routes)
│       │   ├── appointments.ts      ← /api/appointments (frontend + n8n routes)
│       │   ├── availability.ts      ← /api/availability (frontend + n8n slot query)
│       │   └── users.ts             ← /api/users (frontend admin routes)
│       │
│       ├── controllers/             ← Handle HTTP request/response, parse input, call service
│       │   ├── auth.controller.ts
│       │   ├── candidates.controller.ts
│       │   ├── appointments.controller.ts
│       │   ├── availability.controller.ts
│       │   └── users.controller.ts
│       │
│       ├── services/                ← Business logic — all database queries live here
│       │   ├── candidates.service.ts
│       │   ├── appointments.service.ts
│       │   ├── availability.service.ts
│       │   └── users.service.ts
│       │
│       ├── schemas/                 ← Zod validation schemas for request bodies and query params
│       │   ├── candidate.schema.ts
│       │   ├── appointment.schema.ts
│       │   └── availability.schema.ts
│       │
│       └── swagger/
│           └── setup.ts             ← Full OpenAPI 3.0 spec + Swagger UI setup
│
├── frontend/                        ← Vue 3 SPA
│   ├── package.json
│   ├── vite.config.js               ← Vite build config (aliases, plugins)
│   ├── tailwind.config.js           ← Tailwind CSS config
│   ├── postcss.config.js
│   ├── index.html                   ← HTML entry point (Vite injects bundle here)
│   ├── .env                         ← Local dev env (not committed, use .env.example)
│   ├── .env.example                 ← Template
│   ├── .env.production              ← Production env (committed — sets VITE_API_URL)
│   │
│   └── src/
│       ├── main.js                  ← Vue app bootstrap (mounts app, registers plugins)
│       ├── App.vue                  ← Root component — triggers auth.fetchMe() on load
│       │
│       ├── api/
│       │   └── index.js             ← Axios instance + all API call functions (one per resource)
│       │
│       ├── stores/
│       │   └── auth.js              ← Pinia auth store (token, user, login/logout/fetchMe)
│       │
│       ├── router/
│       │   └── index.js             ← All routes + navigation guards (auth, admin check)
│       │
│       ├── components/
│       │   ├── layout/
│       │   │   ├── AppLayout.vue    ← Shell: sidebar + topbar + <RouterView />
│       │   │   ├── Sidebar.vue      ← Left nav (Dashboard, Candidates, Appointments, etc.)
│       │   │   └── Topbar.vue       ← Top bar with user info + logout button
│       │   ├── candidates/
│       │   │   └── CandidateDrawer.vue  ← Slide-in panel for candidate quick-view
│       │   └── shared/
│       │       ├── ConfirmDialog.vue    ← Reusable delete confirmation modal
│       │       └── StatusBadge.vue      ← Coloured badge for candidate statuses
│       │
│       ├── views/                   ← Full page components (one per route)
│       │   ├── LoginView.vue        ← Email + password login form
│       │   ├── DashboardView.vue    ← Stats summary + recent activity
│       │   ├── CandidatesView.vue   ← Paginated, filterable candidate table
│       │   ├── CandidateDetailView.vue  ← Full candidate record (AI review, transcript, etc.)
│       │   ├── AppointmentsView.vue ← Calendar/list of booked interviews
│       │   ├── AvailabilityView.vue ← Manager availability window management
│       │   └── UsersView.vue        ← User list + role/deactivate (Admin only)
│       │
│       └── assets/
│           └── main.css             ← Tailwind base imports
│
└── scripts/
    ├── setup.sh                     ← Full first-time deploy (installs deps, migrates DB, builds, starts PM2)
    ├── deploy-frontend.sh           ← Incremental frontend-only redeploy
    └── nginx-hr.conf                ← Nginx site config — copy to /etc/nginx/sites-available/
```

---

## 4. How the Backend Works

### Entry Point — `src/index.ts`

This is where everything starts. On launch it:
1. Imports `./config/env` first — validates all required environment variables. If any are missing or malformed, the process exits immediately with a descriptive error. This prevents silent misconfigurations in production.
2. Creates an Express app.
3. Adds middleware in order: `helmet` (security headers), `cors` (only allows requests from `FRONTEND_URL`), `morgan` (HTTP logging), JSON body parsing (up to 2 MB to allow large call transcripts).
4. Mounts a `/health` endpoint — used by monitoring tools to check the server is alive.
5. Sets up Swagger UI at `/api/docs`.
6. Mounts all route files under `/api/...`.
7. Adds a 404 catch-all and the central error handler.
8. Listens on `PORT` (default 3001).
9. Registers a `SIGTERM` handler for graceful shutdown — closes the HTTP server and disconnects Prisma before exiting.

### Request Flow

Every incoming request flows through this chain:

```
HTTP Request
    ↓
Nginx (terminates SSL, proxies to :3001)
    ↓
Express middleware (helmet → cors → morgan → body parser)
    ↓
Route file (e.g. routes/candidates.ts)
    ↓
Auth middleware (auth.ts) — validates JWT or X-API-Key
    ↓
RBAC middleware (rbac.ts) — checks role hierarchy
    ↓
Controller (e.g. candidates.controller.ts) — parses + validates request via Zod schema
    ↓
Service (e.g. candidates.service.ts) — executes Prisma queries
    ↓
HTTP Response (JSON)
    ↓
errorHandler.ts — catches any thrown errors and sends appropriate HTTP status
```

### Layered Architecture

The backend follows a strict separation of concerns:

- **Routes** (`src/routes/`): Define which HTTP methods and paths exist. Wire up auth and RBAC middleware. Call controllers. Nothing else.
- **Controllers** (`src/controllers/`): Parse and validate incoming request body/query using Zod schemas. Call the service. Send the HTTP response. Catch errors with `next(err)`.
- **Services** (`src/services/`): All database interaction happens here using Prisma. Business rules live here (e.g. soft delete, duplicate check, slot calculation). Never touch `req` or `res`.
- **Schemas** (`src/schemas/`): Zod validation schemas define exactly what shape of data is allowed in. They also export TypeScript types via `z.infer<>` — used by services so TypeScript enforces correctness end-to-end.

### Error Handling

The central `errorHandler.ts` middleware handles:
- **ZodError** → 400 with field-level validation details
- **Prisma P2002** (unique constraint) → 409 Conflict
- **Prisma P2025** (record not found) → 404
- **Error('NOT_FOUND')** thrown by services → 404
- **Error('FORBIDDEN')** → 403
- Anything else → 500 Internal Server Error

All errors are logged to stdout (captured by PM2 to log files).

### TypeScript Build

The TypeScript source in `src/` is compiled to plain JavaScript in `dist/` by running `npm run build` (which runs `tsc`). PM2 runs the compiled `dist/index.js` — not the TypeScript source directly.

---

## 5. How the Frontend Works

### Technology Choices

The frontend is a **Vue 3 Single Page Application** built with Vite. It uses:
- **Composition API** (not Options API) throughout — modern Vue style with `<script setup>`.
- **Pinia** for state management — specifically for auth state (current user, token, login/logout).
- **Vue Router** with `createWebHistory` — clean URLs without hash (#). This requires that the server serves `index.html` for all unknown paths (PM2's `serve -s dist` handles this automatically).
- **Axios** with interceptors — JWT token is automatically attached to every request. Any 401 response globally redirects to login.
- **Tailwind CSS** — all styling is utility classes, no custom CSS beyond Tailwind base imports.

### How Auth Works in the Frontend

1. On app load (`App.vue`), if a token exists in localStorage, `auth.fetchMe()` is called to re-validate the token and refresh user info.
2. The `auth` Pinia store holds `token` and `user`, persisted to localStorage under `hr_token` and `hr_user`.
3. Vue Router navigation guards (`router/index.js`) check `auth.isAuthenticated` before allowing access to any protected route, and check `auth.isAdmin` for the Users page.
4. The Axios interceptor reads `hr_token` from localStorage on every request and adds `Authorization: Bearer <token>`.
5. On any 401 response, the interceptor clears localStorage and redirects to `/login`.

### Route Structure

| Route | Component | Access |
|---|---|---|
| `/login` | `LoginView.vue` | Public (redirects to dashboard if already logged in) |
| `/dashboard` | `DashboardView.vue` | Any authenticated user |
| `/candidates` | `CandidatesView.vue` | HR and above |
| `/candidates/:id` | `CandidateDetailView.vue` | HR and above |
| `/appointments` | `AppointmentsView.vue` | HR and above |
| `/availability` | `AvailabilityView.vue` | HR and above |
| `/users` | `UsersView.vue` | ADMIN only |

Any unknown path redirects to `/` which redirects to `/dashboard`.

### Production Build

Running `npm run build` inside `frontend/` produces a `dist/` folder with:
- `dist/index.html` — the entry HTML
- `dist/assets/` — compiled JS, CSS, and other assets with content-hash filenames for cache-busting

The production build reads `.env.production` automatically via Vite. The only variable set there is:
```
VITE_API_URL=https://hr-api.aygfoods.com
```

This tells Axios to send all API requests to the public API domain.

---

## 6. Database Schema

The database is PostgreSQL 16. The schema lives in `backend/prisma/schema.prisma` and is the single source of truth. Prisma generates TypeScript types from it automatically.

### `User`

Stores all human users of the frontend dashboard.

| Column | Type | Notes |
|---|---|---|
| `id` | String (CUID) | Primary key, auto-generated |
| `email` | String | Unique, must be `@aygfoods.com` |
| `name` | String | Display name |
| `role` | Enum | `ADMIN`, `MANAGER`, or `HR` |
| `passwordHash` | String? | bcrypt hash (12 rounds). Null = user cannot login |
| `isActive` | Boolean | Inactive users are blocked at login |
| `createdAt` | DateTime | Auto-set |
| `updatedAt` | DateTime | Auto-updated |

### `Candidate`

The core table. Every job applicant is a row here.

| Column | Type | Notes |
|---|---|---|
| `id` | String (CUID) | Primary key |
| `postingName` | String | Job posting title, e.g. "LCF Cashier" |
| `location` | String | Store/location name, e.g. "LCF Airtex" |
| `candidateName` | String | Applicant's full name |
| `phone` | String? | Phone number (extracted by n8n from email/resume) |
| `dateApplied` | String? | Human-readable date from the job platform |
| `hiringManager` | String? | Manager name for this posting |
| `recruiter` | String? | Recruiter name |
| `status` | String | See Candidate Status Lifecycle section |
| `receivedAt` | DateTime? | When the application email was received |
| `emailId` | String | **Unique** Gmail message ID — used as the stable identifier by n8n. This is how n8n looks up and updates a candidate without needing the DB id |
| `aiScore` | Float? | 0–100 score from AI review |
| `aiRecommendation` | String? | `HIRE`, `MAYBE`, or `REJECT` |
| `aiCriteriaMet` | String? | Comma-separated list of criteria the candidate meets |
| `aiCriteriaMissing` | String? | Comma-separated list of criteria the candidate lacks |
| `aiSummary` | String? | Free-text AI summary of the candidate |
| `reviewedAt` | DateTime? | When the AI review was completed |
| `called` | String? | Whether a call was attempted/completed, e.g. "yes", "no_answer" |
| `transcript` | Text? | Full call transcript from Vapi (can be long — stored as Text) |
| `deletedAt` | DateTime? | Soft delete — `null` means active, set = deleted |
| `createdAt` | DateTime | Auto-set |
| `updatedAt` | DateTime | Auto-updated |

Indexes on `status`, `location`, `postingName`, `emailId`, `deletedAt` for fast filtering.

### `ManagerAvailability`

Defines when each manager is available for interviews at each location.

| Column | Type | Notes |
|---|---|---|
| `id` | String (CUID) | Primary key |
| `location` | String | e.g. "LCF Airtex" |
| `managerName` | String | e.g. "Tom" |
| `managerEmail` | String | e.g. "tom@aygfoods.com" |
| `dayOfWeek` | String | e.g. "Saturday" |
| `startTime` | String | e.g. "15:00" (24-hour HH:MM) |
| `endTime` | String | e.g. "18:00" |
| `slotDuration` | String | Default "20 Min" (informational — slot engine always uses 20 minutes) |
| `active` | Boolean | Inactive windows are excluded from slot generation |

A manager can have multiple rows — e.g. available Saturday AND Sunday, or two windows on the same day.

### `Appointment`

Each booked interview occupies one row.

| Column | Type | Notes |
|---|---|---|
| `id` | String (CUID) | Primary key |
| `location` | String | Must match the location used in availability |
| `managerName` | String? | Manager's name |
| `managerEmail` | String? | Manager's email — used to de-conflict slots |
| `candidateName` | String | Who is being interviewed |
| `jobRole` | String? | The role they are interviewing for |
| `interviewDate` | DateTime | Full datetime of the interview |
| `day` | String? | Day of week, e.g. "Saturday" |
| `startTime` | String | e.g. "17:00" |
| `endTime` | String | e.g. "17:20" |
| `slotDuration` | String | Default "20 min" |
| `active` | Boolean | `false` = cancelled. Cancelled appointments free up slots |

### Running Migrations

After any change to `schema.prisma`:

```bash
# Development (creates a new migration file and applies it)
cd backend
npx prisma migrate dev --name describe_your_change

# Production (applies pending migrations without creating new files)
cd backend
npx prisma migrate deploy
```

### Seeding Users

To create the initial users (admin, manager, HR staff):

```bash
cd backend
# Edit prisma/seed.ts first — change the names, emails, and passwords
npx ts-node prisma/seed.ts
```

The seed script uses `upsert` so it is safe to run multiple times — it will update existing users rather than create duplicates.

---

## 7. Authentication & Security

### How Login Works

1. User submits email + password to `POST /api/auth/login`.
2. Backend checks the email ends with `@aygfoods.com` (enforced by `ORG_EMAIL_DOMAIN` env var). Non-org emails get 403.
3. Backend looks up the user by email.
4. Backend compares the submitted password to the stored bcrypt hash.
5. If valid and user is active, backend issues a signed JWT (HS256) with a **8-hour expiry**.
6. JWT payload contains: `sub` (user ID), `email`, `role`, `name`.
7. The token is returned to the frontend and stored in localStorage as `hr_token`.

### How Protected Routes Work

Every protected API route goes through `auth` middleware:
1. The middleware first checks for an `X-API-Key` header. If present and matches `N8N_API_KEY`, the request is flagged as `req.isN8N = true` and passes through without JWT checks. This is how n8n accesses the API.
2. If no API key, it looks for `Authorization: Bearer <token>`.
3. The JWT is verified using `jose` (not jsonwebtoken) — it validates the signature and expiry.
4. The user record is fetched from the DB to confirm the user still exists and is active.
5. The user object is attached to `req.user` for use by controllers.

### RBAC (Role-Based Access Control)

The `rbac` middleware wraps routes that require specific roles:

```typescript
rbac('HR')      // Allows HR, MANAGER, and ADMIN (hierarchy: ADMIN=3, MANAGER=2, HR=1)
rbac('MANAGER') // Allows MANAGER and ADMIN only
rbac('ADMIN')   // Allows ADMIN only
```

n8n API key bypasses RBAC entirely — it has access to all n8n-designated endpoints regardless of role.

### JWT Secret

Generated with `openssl rand -hex 32`. Must be at least 32 characters. Lives in `backend/.env` as `JWT_SECRET`. If this is changed, all existing tokens are immediately invalidated and all users will need to log in again.

---

## 8. n8n Integration — How It Works

### Overview

n8n is the automation engine that drives the core recruitment pipeline. It was pre-existing before this platform was built. Previously it read and wrote data to Google Sheets. **Now it reads and writes to this backend API instead.** The API was designed specifically to match what n8n was previously doing with Google Sheets.

### Authentication from n8n

n8n sends a static API key in the `X-API-Key` request header:
```
X-API-Key: <value of N8N_API_KEY in backend .env>
```

This must match exactly. No JWT needed. The same key is used for all n8n → backend communication.

**Important:** This key must be set in two places:
1. `backend/.env` as `N8N_API_KEY`
2. Inside n8n, in the HTTP Request nodes as the `X-API-Key` header value

### The n8n API Endpoints (What n8n Calls and Why)

#### 1. Create a new candidate
```
POST /api/candidates
Header: X-API-Key: <key>
Body: {
  postingName: "LCF Cashier",
  location: "LCF Airtex",
  candidateName: "John Smith",
  phone: "5551234567",
  dateApplied: "23 Feb 2026",
  hiringManager: "Emerson Medrano",
  emailId: "19c8cd9c4505a04f",   ← Gmail message ID (unique per email)
  receivedAt: "2026-02-23T10:00:00Z"
}
```
Called when a new application email arrives in Gmail. The `emailId` is the Gmail message ID — it is used as the unique identifier for this candidate throughout the entire n8n workflow. If a duplicate `emailId` is sent, the API returns 409 Conflict (prevents duplicate records).

#### 2. Look up a candidate by Gmail emailId
```
GET /api/candidates/by-email/:emailId
Header: X-API-Key: <key>
```
Called after AI review or after a call, when n8n needs to confirm the candidate exists before updating it.

#### 3. Post AI review results
```
PATCH /api/candidates/:emailId/ai-review
Header: X-API-Key: <key>
Body: {
  aiScore: 80,
  aiRecommendation: "HIRE",
  aiCriteriaMet: "Experience, Availability, Location",
  aiCriteriaMissing: "Spanish language",
  aiSummary: "Strong candidate with relevant experience...",
  status: "reviewed",
  reviewedAt: "2026-02-23T10:05:00Z"
}
```
Called after the AI scoring node completes. Updates the candidate with AI analysis results and changes status to `reviewed`.

#### 4. Post call transcript and outcome
```
PATCH /api/candidates/:emailId/call-result
Header: X-API-Key: <key>
Body: {
  transcript: "Full transcript text...",
  called: "yes",
  status: "called"
}
```
Called after Vapi completes an outbound AI phone call. Stores the full transcript and updates the candidate status.

#### 5. Get available interview slots
```
GET /api/availability/slots?location=LCF+Airtex&dayOfWeek=Saturday&date=2026-04-12
Header: X-API-Key: <key>
Response: {
  slots: [
    { date: "2026-04-12", day: "Saturday", startTime: "15:00", endTime: "15:20", managerName: "Tom", managerEmail: "tom@aygfoods.com", location: "LCF Airtex" },
    { date: "2026-04-12", day: "Saturday", startTime: "15:20", endTime: "15:40", managerName: "Tom", managerEmail: "tom@aygfoods.com", location: "LCF Airtex" },
    ...
  ]
}
```
Called when n8n needs to schedule an interview. The slot engine queries `ManagerAvailability` for the given location+day, then subtracts all already-booked `Appointment` rows for that date, and returns only the free slots in 20-minute increments. n8n (or Vapi) can then offer these slots to the candidate during the phone call.

#### 6. Book an interview appointment
```
POST /api/appointments
Header: X-API-Key: <key>
Body: {
  location: "LCF Airtex",
  managerName: "Tom",
  managerEmail: "tom@aygfoods.com",
  candidateName: "John Smith",
  jobRole: "Cashier",
  interviewDate: "2026-04-12",
  day: "Saturday",
  startTime: "15:00",
  endTime: "15:20"
}
```
Called after the candidate confirms a slot. Creates the appointment record, which then makes that slot unavailable to future slot queries.

#### 7. Reset stuck candidates
```
POST /api/candidates/reset-problematic
Header: X-API-Key: <key>
Response: { reset: 3 }
```
Called by a scheduled n8n workflow (e.g. nightly). Finds candidates in the `reviewed` status that haven't been updated in over 24 hours and resets them back to `pending`. This handles cases where the AI review completed but the next step in the pipeline stalled.

#### 8. Get pending candidates (for triggering pipeline)
```
GET /api/candidates?status=pending&limit=100
Header: X-API-Key: <key>
```
Called by n8n to pick up new candidates and trigger the AI review step.

### Migration from Google Sheets

The API was designed as a direct replacement. Here is the mapping:

| Old (Google Sheets) | New (API) |
|---|---|
| Append row to "Candidates" sheet | `POST /api/candidates` |
| Read rows where status = pending | `GET /api/candidates?status=pending&limit=100` |
| Update row with AI review | `PATCH /api/candidates/{emailId}/ai-review` |
| Read "Availability" sheet for location+day | `GET /api/availability/slots?location=X&dayOfWeek=Y&date=Z` |
| Read "Appointments" sheet for conflicts | Built into the slots endpoint — conflicts are auto-subtracted |
| Append row to "Appointments" sheet | `POST /api/appointments` |
| Update row with transcript | `PATCH /api/candidates/{emailId}/call-result` |
| Read all candidates | `GET /api/candidates?limit=9999` |
| Reset problematic candidates | `POST /api/candidates/reset-problematic` |

---

## 9. Server Setup & Deployment Architecture

### Overview

```
Internet
    ↓ HTTPS (443)
Nginx (reverse proxy + SSL termination)
    ├── hr.aygfoods.com → :3000 (PM2: hr-frontend)
    └── hr-api.aygfoods.com → :3001 (PM2: hr-backend)
        ↑
        PostgreSQL (:5432, localhost only)
```

Ports 3000 and 3001 are blocked by UFW — they are never accessible from the internet directly. All external traffic goes through Nginx on port 443.

### Server Specs

- **OS:** Ubuntu 24.04 LTS
- **Node.js:** v20 LTS
- **IP:** 46.62.166.147

### Firewall Rules (UFW)

```
22    SSH    ALLOW
80    HTTP   ALLOW  → Nginx immediately 301-redirects to HTTPS
443   HTTPS  ALLOW
3000  Vue    DENY   (internal only)
3001  API    DENY   (internal only)
5432  PG     DENY   (internal only)
```

### What PM2 Runs

PM2 manages two processes, both defined in `backend/ecosystem.config.js`:

**hr-backend**
- Script: `dist/index.js` (compiled TypeScript)
- Working directory: `/root/ayg-hr-automation/backend`
- Port: 3001
- Memory limit: 512 MB (auto-restart if exceeded)
- Logs: `backend/logs/out.log` and `backend/logs/err.log`

**hr-frontend**
- Script: `serve` (the `serve` npm package)
- Args: `-s dist -l 3000` — `-s` flag means SPA mode (all unknown paths serve `index.html`, required for Vue Router's history mode)
- Working directory: `/root/ayg-hr-automation/frontend`
- Port: 3000
- Memory limit: 128 MB
- Logs: `frontend/logs/out.log` and `frontend/logs/err.log`

Both processes have `autorestart: true` — PM2 restarts them automatically if they crash.

After running `pm2 startup` and `pm2 save`, PM2 registers itself with systemd and restores all saved processes on server reboot.

---

## 10. Environment Variables

### Backend — `backend/.env`

This file is **never committed to git** (listed in .gitignore). It must be created manually on the server.

```env
# ─── Database ──────────────────────────────────────────────────────────────────
DATABASE_URL="postgresql://user:password@localhost:5432/hr_recruitment"

# ─── Auth ───────────────────────────────────────────────────────────────────────
# Generate with: openssl rand -hex 32
JWT_SECRET=your-random-32-char-min-secret-here

# Only emails ending with this domain can log in
ORG_EMAIL_DOMAIN=aygfoods.com

# ─── n8n / Vapi API Key ─────────────────────────────────────────────────────────
# Generate with: openssl rand -hex 32
# Must match the X-API-Key header value used in n8n HTTP Request nodes
N8N_API_KEY=your-long-random-api-key-here

# ─── App ────────────────────────────────────────────────────────────────────────
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://hr.aygfoods.com
```

All variables are validated at startup by `src/config/env.ts` using Zod. If any are missing or invalid, the server **refuses to start** and prints a clear error message. This is intentional — running with bad config is worse than not running at all.

### Frontend — `frontend/.env.production`

This file **is committed to git** because it contains no secrets — only the public API URL.

```env
VITE_API_URL=https://hr-api.aygfoods.com
```

Vite bakes this into the compiled JS at build time. If the API URL ever changes, update this file, rebuild the frontend, and redeploy.

For local development, create `frontend/.env` (not committed):
```env
VITE_API_URL=http://localhost:3001
```

---

## 11. Nginx Configuration

The config file is at `scripts/nginx-hr.conf` in the repo. On the server it lives at `/etc/nginx/sites-available/ayg-hr` with a symlink from `sites-enabled/`.

### What it does

**hr.aygfoods.com (Frontend)**
- Port 80 → 301 redirect to HTTPS
- Port 443 → SSL termination via Let's Encrypt → proxy_pass to `http://127.0.0.1:3000`
- Security headers: X-Frame-Options SAMEORIGIN, X-Content-Type-Options nosniff
- Cache-Control: no-cache on all responses (forces browser to always check for updates)

**hr-api.aygfoods.com (Backend)**
- Port 80 → 301 redirect to HTTPS
- Port 443 → SSL termination via Let's Encrypt → proxy_pass to `http://127.0.0.1:3001`
- Security headers: X-Frame-Options DENY, X-Content-Type-Options nosniff
- `proxy_read_timeout 30s` — allows up to 30 seconds for API responses
- `client_max_body_size 5m` — allows request bodies up to 5 MB (for transcripts)

### Managing Nginx

```bash
# Test config for syntax errors (always do this before reloading)
sudo nginx -t

# Reload config (no downtime)
sudo systemctl reload nginx

# Full restart (if reload doesn't work)
sudo systemctl restart nginx

# Check status
sudo systemctl status nginx

# View error logs
tail -f /var/log/nginx/error.log
```

### SSL Certificates

Certificates are managed by Let's Encrypt / certbot. They live at:
- `/etc/letsencrypt/live/hr.aygfoods.com/`
- `/etc/letsencrypt/live/hr-api.aygfoods.com/`

Certbot sets up a cron job or systemd timer to auto-renew every 90 days. To manually renew:
```bash
sudo certbot renew
sudo systemctl reload nginx
```

---

## 12. PM2 Process Manager

```bash
pm2 list                       # see all processes and their status
pm2 status                     # same as list

pm2 logs hr-backend            # tail backend logs
pm2 logs hr-frontend           # tail frontend logs
pm2 logs hr-backend --lines 100  # last 100 lines

pm2 restart hr-backend         # restart backend (zero downtime restart)
pm2 restart hr-frontend        # restart frontend

pm2 stop hr-backend            # stop without removing
pm2 delete hr-backend          # stop and remove from PM2 list

pm2 save                       # save current process list to resurrect on reboot
pm2 startup                    # generate and register the systemd startup command
pm2 resurrect                  # manually restore saved process list
```

If you need to fully restart everything from scratch:
```bash
cd /root/ayg-hr-automation/backend
pm2 delete hr-backend
pm2 delete hr-frontend
pm2 start ecosystem.config.js --env production
pm2 save
```

---

## 13. How to Deploy / Update

### First-Time Setup on a New Server

```bash
# 1. Clone the repo
git clone https://github.com/asimilaladil/ayg-hr-automation.git
cd ayg-hr-automation

# 2. Create backend .env
cp backend/.env.example backend/.env
nano backend/.env   # fill in real values

# 3. Run the setup script (installs deps, migrates DB, builds, starts PM2)
bash scripts/setup.sh

# 4. Copy and enable Nginx config
sudo cp scripts/nginx-hr.conf /etc/nginx/sites-available/ayg-hr
sudo ln -sf /etc/nginx/sites-available/ayg-hr /etc/nginx/sites-enabled/ayg-hr
sudo nginx -t && sudo systemctl reload nginx

# 5. Set up SSL (first time)
sudo certbot --nginx -d hr.aygfoods.com -d hr-api.aygfoods.com

# 6. Seed initial users
cd backend
npx ts-node prisma/seed.ts
```

### Update Backend Code

```bash
cd /root/ayg-hr-automation
git pull origin master
cd backend
npm install                        # only if package.json changed
npm run build                      # compile TypeScript to dist/
npx prisma migrate deploy          # only if schema.prisma changed
pm2 restart hr-backend
```

### Update Frontend Code Only

```bash
bash /root/ayg-hr-automation/scripts/deploy-frontend.sh
```

This script: installs deps → builds Vue app → stops old PM2 process → starts new one.

### Update Both Backend and Frontend

```bash
cd /root/ayg-hr-automation
git pull origin master
cd backend && npm install && npm run build && npx prisma migrate deploy && pm2 restart hr-backend
cd ../frontend && npm install && npm run build && pm2 restart hr-frontend
```

### After Changing Environment Variables

```bash
# Backend: edit .env then restart
nano /root/ayg-hr-automation/backend/.env
pm2 restart hr-backend

# Frontend: edit .env.production, rebuild, restart
nano /root/ayg-hr-automation/frontend/.env.production
cd /root/ayg-hr-automation/frontend && npm run build
pm2 restart hr-frontend
```

---

## 14. API Reference

**Base URL:** `https://hr-api.aygfoods.com`

**Authentication:**
- Frontend users: `Authorization: Bearer <JWT token from /api/auth/login>`
- n8n / automation: `X-API-Key: <N8N_API_KEY>`

**Interactive Docs:** `https://hr-api.aygfoods.com/api/docs`

---

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | None | Login with email + password. Returns `{ user, token }` |
| GET | `/health` | None | Health check. Returns `{ status: "ok", ts: "..." }` |

---

### Candidates

| Method | Endpoint | Auth | Who | Description |
|---|---|---|---|---|
| GET | `/api/candidates` | JWT | HR+ | List candidates. Supports filters: `status`, `location`, `postingName`, `aiRecommendation`, `search`, `page`, `limit`, `sortBy`, `sortOrder` |
| GET | `/api/candidates/:id` | JWT | HR+ | Get one candidate by DB id |
| PATCH | `/api/candidates/:id` | JWT | HR+ | Manual edit (name, status, location, etc.) |
| DELETE | `/api/candidates/:id` | JWT | ADMIN | Soft-delete (sets deletedAt) |
| GET | `/api/candidates/by-email/:emailId` | API Key | n8n | Look up candidate by Gmail message ID |
| POST | `/api/candidates` | API Key | n8n | Create new candidate from job application |
| PATCH | `/api/candidates/:emailId/ai-review` | API Key | n8n | Post AI score + recommendation |
| PATCH | `/api/candidates/:emailId/call-result` | API Key | n8n/Vapi | Post call transcript + outcome |
| POST | `/api/candidates/reset-problematic` | API Key | n8n | Reset stuck candidates back to pending |

---

### Appointments

| Method | Endpoint | Auth | Who | Description |
|---|---|---|---|---|
| GET | `/api/appointments` | JWT | HR+ | List appointments. Filters: `location`, `date` (YYYY-MM-DD), `managerEmail`, `page`, `limit` |
| GET | `/api/appointments/:id` | JWT | HR+ | Get one appointment |
| PATCH | `/api/appointments/:id` | JWT | MANAGER+ | Edit appointment |
| DELETE | `/api/appointments/:id` | JWT | MANAGER+ | Cancel appointment (sets active=false, frees the slot) |
| POST | `/api/appointments` | API Key | n8n | Book an interview slot |

---

### Availability

| Method | Endpoint | Auth | Who | Description |
|---|---|---|---|---|
| GET | `/api/availability` | JWT | HR+ | List all availability windows. Filters: `location`, `dayOfWeek`, `managerEmail`, `active` |
| GET | `/api/availability/:id` | JWT | MANAGER+ | Get one window |
| POST | `/api/availability` | JWT | MANAGER+ | Add a new availability window |
| PATCH | `/api/availability/:id` | JWT | MANAGER+ | Edit a window |
| DELETE | `/api/availability/:id` | JWT | MANAGER+ | Remove a window |
| GET | `/api/availability/slots` | API Key | n8n/Vapi | Get free 20-min slots. Required params: `location`, `dayOfWeek`, `date` (YYYY-MM-DD) |

---

### Users

| Method | Endpoint | Auth | Who | Description |
|---|---|---|---|---|
| GET | `/api/users/me` | JWT | Any | Get current logged-in user |
| GET | `/api/users` | JWT | ADMIN | List all users |
| PATCH | `/api/users/:id/role` | JWT | ADMIN | Change user's role. Body: `{ role: "ADMIN" | "MANAGER" | "HR" }` |
| PATCH | `/api/users/:id/deactivate` | JWT | ADMIN | Deactivate user (blocks login) |

---

## 15. Role-Based Access Control

### Role Hierarchy

```
ADMIN (3) > MANAGER (2) > HR (1)
```

Higher-numbered roles pass all checks for lower-numbered roles. So `rbac('HR')` allows HR, MANAGER, and ADMIN. `rbac('ADMIN')` allows only ADMIN.

### What Each Role Can Do

| Action | HR | MANAGER | ADMIN |
|---|---|---|---|
| View candidates | ✅ | ✅ | ✅ |
| Edit candidate (name, status) | ✅ | ✅ | ✅ |
| Delete candidate (soft) | ❌ | ❌ | ✅ |
| View appointments | ✅ | ✅ | ✅ |
| Edit/cancel appointments | ❌ | ✅ | ✅ |
| View availability windows | ✅ | ✅ | ✅ |
| Add/edit/delete availability | ❌ | ✅ | ✅ |
| View user list | ❌ | ❌ | ✅ |
| Change user roles | ❌ | ❌ | ✅ |
| Deactivate users | ❌ | ❌ | ✅ |

n8n (API key) bypasses all role checks — it can call any endpoint designated for API key access.

### Adding a New User

1. Edit `backend/prisma/seed.ts` — add the new user to the `users` array.
2. Run `npx ts-node prisma/seed.ts` on the server.

Or via API (requires an ADMIN token):
```bash
# There is no create-user endpoint — users are created via seed only.
# To add a user without the seed script, use psql directly:
# (Make sure to bcrypt-hash the password first)
```

Alternatively, log in as ADMIN and use the Users page to change an existing user's role.

---

## 16. Candidate Status Lifecycle

Candidates move through these statuses:

```
pending
  ↓ (n8n AI review runs)
reviewed
  ↓ (n8n Vapi call runs)
called
  ↓ (appointment booked — status can be updated manually)
processed_no_resume   ← application had no resume attached
not_found             ← phone number invalid / unreachable
```

The `reset-problematic` endpoint moves candidates from `reviewed` back to `pending` if they've been stuck for 24+ hours — this handles cases where the pipeline stalled mid-flow.

---

## 17. Slot & Appointment Logic

### How Free Slots Are Calculated

When n8n calls `GET /api/availability/slots?location=X&dayOfWeek=Y&date=Z`:

1. The service queries `ManagerAvailability` for all active windows at that location on that day of week.
2. It queries `Appointment` for all active (non-cancelled) bookings at that location on that specific date.
3. For each availability window, it generates 20-minute time slots from `startTime` to `endTime`.
4. It builds a set of "booked keys": `managerEmail__startTime` (e.g. `tom@aygfoods.com__15:00`).
5. It filters out any generated slot whose key exists in the booked set.
6. Returns only the free slots.

### Example

Manager Tom is available Saturday 15:00–18:00 at LCF Airtex. That generates slots: 15:00, 15:20, 15:40, 16:00, 16:20, 16:40, 17:00, 17:20, 17:40.

If 15:00 and 16:00 are already booked, the API returns: 15:20, 15:40, 16:20, 16:40, 17:00, 17:20, 17:40.

### Deleting/Cancelling Appointments

Deleting an appointment sets `active = false`. The slot query only looks at `active: true` appointments, so the slot becomes available again immediately.

---

## 18. User Management

### Creating the First Admin

The very first admin user must be created via the seed script since there is no signup page:

```bash
cd /root/ayg-hr-automation/backend
# Edit prisma/seed.ts with your real admin email/password first
npx ts-node prisma/seed.ts
```

### Changing Roles

Via the Admin UI at `https://hr.aygfoods.com/users` → change the role dropdown for any user.

Via API:
```bash
curl -X PATCH https://hr-api.aygfoods.com/api/users/<USER_ID>/role \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"role": "MANAGER"}'
```

### Deactivating a User

Via Admin UI: click "Deactivate" on the user.

Via API:
```bash
curl -X PATCH https://hr-api.aygfoods.com/api/users/<USER_ID>/deactivate \
  -H "Authorization: Bearer <admin-token>"
```

Deactivated users cannot log in (403 response). Their data is preserved. They can be reactivated by an admin via database if needed (there is no reactivate UI endpoint currently — direct DB update required).

---

## 19. Troubleshooting

### Check All Services

```bash
pm2 list                          # PM2 processes
sudo systemctl status nginx       # Nginx
sudo systemctl status postgresql  # Database
```

### Backend Logs

```bash
pm2 logs hr-backend               # live tail
pm2 logs hr-backend --lines 200   # last 200 lines
cat /root/ayg-hr-automation/backend/logs/err.log  # error log
```

### Frontend Logs

```bash
pm2 logs hr-frontend
cat /root/ayg-hr-automation/frontend/logs/err.log
```

### Nginx Logs

```bash
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log
```

### If the Backend Won't Start

The most common cause is a missing or invalid environment variable. PM2 captures the startup error but the clearest way to see it is:

```bash
cd /root/ayg-hr-automation/backend
NODE_ENV=production node dist/index.js
# or for TypeScript directly:
npx ts-node src/index.ts
```

The env validator will print exactly which variable is missing.

### If the Frontend Returns 404 on Refresh

This means `serve` is not running in SPA mode. The PM2 config uses `serve -s dist -l 3000` — the `-s` flag is critical. Verify:
```bash
pm2 list   # check hr-frontend is running
pm2 logs hr-frontend  # check for errors
```

### If n8n Gets 401 Unauthorized

Check:
1. The `N8N_API_KEY` in `backend/.env` matches the `X-API-Key` value set in n8n.
2. The header name is exactly `X-API-Key` (case matters in some HTTP clients).
3. The backend was restarted after changing the `.env`.

### If the Database Connection Fails

```bash
sudo systemctl status postgresql
sudo systemctl restart postgresql

# Test connection directly
psql -U postgres -d hr_recruitment -h localhost
```

Also check the `DATABASE_URL` in `backend/.env` is correct.

### Common PM2 Commands for Recovery

```bash
# Full restart of everything
cd /root/ayg-hr-automation/backend
pm2 delete all
pm2 start ecosystem.config.js --env production
pm2 save

# If PM2 itself crashed (rare)
pm2 resurrect   # restores last saved process list
```

---

## 20. Security Checklist

- [x] Ports 3000 and 3001 blocked externally via UFW
- [x] SSL/HTTPS on both domains via Let's Encrypt
- [x] Only `@aygfoods.com` email addresses can log in (enforced in auth controller)
- [x] Passwords hashed with bcrypt (12 rounds)
- [x] JWT tokens expire after 8 hours
- [x] N8N API key required for all automation access
- [x] RBAC middleware on all frontend-facing routes
- [x] Soft deletes — data is never permanently lost from UI actions
- [x] Helmet security headers on all API responses
- [x] CORS restricted to `FRONTEND_URL` only
- [x] Body size limit (2 MB) to prevent large payload attacks
- [ ] **Set strong `JWT_SECRET`**: `openssl rand -hex 32`
- [ ] **Set strong `N8N_API_KEY`**: `openssl rand -hex 32`
- [ ] **Change default seed passwords** from `ChangeMe123!` after first login
- [ ] **Set up database backups** — recommended: daily `pg_dump` cron job
  ```bash
  # Example cron (runs daily at 2am)
  0 2 * * * pg_dump -U postgres hr_recruitment | gzip > /backups/hr_$(date +\%Y\%m\%d).sql.gz
  ```
- [ ] **Set up uptime monitoring** — e.g. UptimeRobot pointing to `https://hr.aygfoods.com` and `https://hr-api.aygfoods.com/health`
- [ ] **Rotate secrets regularly** — JWT_SECRET and N8N_API_KEY should be rotated if any team member with access to the server leaves

---

## Quick Reference Card

```bash
# ─── Server ──────────────────────────────────────────────────
ssh root@46.62.166.147

# ─── Project location ────────────────────────────────────────
cd /root/ayg-hr-automation

# ─── PM2 ─────────────────────────────────────────────────────
pm2 list
pm2 logs hr-backend
pm2 logs hr-frontend
pm2 restart hr-backend
pm2 restart hr-frontend

# ─── Deploy backend update ────────────────────────────────────
git pull && cd backend && npm run build && pm2 restart hr-backend

# ─── Deploy frontend update ───────────────────────────────────
bash scripts/deploy-frontend.sh

# ─── DB migrations ───────────────────────────────────────────
cd backend && npx prisma migrate deploy

# ─── Add users ───────────────────────────────────────────────
cd backend && npx ts-node prisma/seed.ts

# ─── Nginx ───────────────────────────────────────────────────
sudo nginx -t && sudo systemctl reload nginx

# ─── SSL renew ───────────────────────────────────────────────
sudo certbot renew && sudo systemctl reload nginx

# ─── API docs ─────────────────────────────────────────────────
open https://hr-api.aygfoods.com/api/docs
```

---

*Document last updated: April 9, 2026*
