# AYG HR Automation

Internal HR Recruitment Platform for AYG Foods. Automates the end-to-end hiring pipeline — from candidate intake and AI screening to interview scheduling and manager notifications — integrated with n8n and Vapi.

---

## Architecture

```
ayg-hr-automation/
├── backend/                Express API (TypeScript) — PORT 3001
│   ├── src/
│   │   ├── controllers/    Request handlers
│   │   ├── routes/         Route definitions
│   │   ├── services/       Business logic
│   │   ├── middleware/      auth · rbac · errorHandler
│   │   └── schemas/        Zod validation schemas
│   └── prisma/
│       └── schema.prisma   PostgreSQL data model
├── frontend/               Vue 3 + Vite (TypeScript) — PORT 3000
│   └── src/
│       ├── views/          Dashboard · Candidates · Appointments · Availability · Users
│       ├── components/     Layout · Shared UI components
│       ├── stores/         Pinia auth store
│       └── api/            Axios API client
└── .env.example
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js · Express · TypeScript |
| Database | PostgreSQL via Prisma ORM |
| Frontend | Vue 3 · Vite · Tailwind CSS · Pinia |
| Automation | n8n (workflow orchestration) |
| AI Calls | Vapi (voice AI for candidate interviews) |
| Process Manager | PM2 |

---

## Features

### Candidate Pipeline
- Candidates created via n8n webhook (from job applications)
- AI scoring and recommendation (HIRE / MAYBE / REJECT) populated by n8n after Claude analysis
- Vapi voice call integration — transcript, recording URL, and interview answers stored per candidate
- Status lifecycle: `pending → reviewing → reviewed → called → no-answer → interview-booked → scheduled → rejected → hired`
- Resume storage and PDF serving
- Full-text search, filter by location (single or multi), status, AI recommendation, hiring manager

### Interview Scheduling
- Appointments booked via n8n using manager availability windows
- Auto-assigns manager based on location availability
- Calculates slot end time from duration
- One appointment per candidate (re-booking replaces existing)

### Manager Availability
- Managers define available days, time windows, and slot durations per location
- Slot suggestion and validation endpoints used by n8n to find open slots

### Location Management
- Each location is assigned one manager
- Transfer location: swap two managers between locations — candidates, appointments, and availability windows move with them
- Assign location: assign a new manager to an existing or newly created location — unmanaged candidates auto-assign to the new manager
- Delete manager: unlinks location and candidates; when a new manager is assigned later, candidates auto-reassign

### Notifications
- Real-time in-app notifications when an appointment is booked
- Manager, all HR, and all ADMIN users are notified
- Bell icon in topbar with unread count badge, polling every 30 seconds
- Mark individual or all notifications as read

### User Management
- Create users (ADMIN, HR, MANAGER) with auto-generated temporary passwords
- Role management, email editing, password reset (admin-initiated), self-service password change
- Deactivate users
- Delete managers with full cascade unlinking

### Dashboard
- Stats cards: Total Candidates · Pending Review · Reviewed · Total Appointments · Today's Interviews
- Today's Interviews list (sorted by time)
- Upcoming Appointments list (future dates)
- Recent Candidates list
- AI Recommendation breakdown chart (Hire / Maybe / Reject)
- All data scoped by role — managers only see their own candidates and appointments

---

## Roles & Permissions

| Role | Permissions |
|---|---|
| `ADMIN` | Full access — user management, delete managers, all data |
| `HR` | Candidates, appointments, users (no role changes), delete managers |
| `MANAGER` | Own candidates and appointments only, availability management |

> Role hierarchy: ADMIN > MANAGER > HR (used for route-level access control)

---

## API Overview

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Email + password login |
| GET | `/api/candidates` | JWT | List candidates (multi-location filter supported) |
| POST | `/api/candidates` | API Key | Create candidate (n8n) |
| PATCH | `/api/candidates/:id` | JWT | Update candidate |
| DELETE | `/api/candidates/:id` | JWT / API Key | Delete candidate + resume |
| GET | `/api/appointments` | JWT | List appointments |
| POST | `/api/appointments` | API Key | Book appointment (n8n) |
| PATCH | `/api/appointments/:id` | JWT | Update appointment |
| GET | `/api/availability` | JWT | List availability windows |
| POST | `/api/availability` | JWT | Create availability window |
| GET | `/api/users` | JWT (ADMIN/HR) | List users |
| POST | `/api/users` | JWT (ADMIN/HR) | Create user |
| DELETE | `/api/users/:id` | JWT (ADMIN/HR) | Delete manager |
| POST | `/api/users/assign-location` | JWT (ADMIN/HR) | Assign location to manager |
| POST | `/api/users/swap-locations` | JWT (ADMIN/HR) | Swap two managers' locations |
| GET | `/api/notifications` | JWT | List notifications + unread count |
| PATCH | `/api/notifications/read-all` | JWT | Mark all notifications read |

### Multi-location filter
The candidates list endpoint accepts multiple locations:
```
GET /api/candidates?location=LCF Cypress,LCF Missouri City&limit=20
GET /api/candidates?location=LCF Cypress&location=LCF Missouri City&limit=20
```

---

## Data Model

```
User ──< Location          (one manager per location)
User ──< Candidate         (hiringManagerId)
User ──< Appointment       (managerId)
User ──< ManagerAvailability
User ──< Notification

Location ──< Candidate
Location ──< Appointment
Location ──< ManagerAvailability

Candidate ──1 Appointment
Posting   ──< Candidate
```

---

## Running the Project

### Prerequisites
- Node.js 18+
- PostgreSQL
- PM2 (`npm install -g pm2`)

### Setup

```bash
git clone https://github.com/asimbilaladil/ayg-hr-automation.git
cd ayg-hr-automation
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET, N8N_API_KEY, etc.
```

### Backend

```bash
cd backend
npm install
npx prisma db push        # apply schema to DB
npm run build             # compile TypeScript → dist/
pm2 start dist/index.js --name hr-backend
```

### Frontend

```bash
cd frontend
npm install
npm run build             # build to dist/
pm2 start --name hr-frontend npm -- run preview
```

### Development

```bash
# Backend (watch mode)
cd backend && npm run dev

# Frontend (hot reload)
cd frontend && npm run dev
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing JWT tokens |
| `N8N_API_KEY` | API key for n8n webhook authentication |
| `FRONTEND_URL` | Frontend origin for CORS (e.g. `https://hr.aygfoods.com`) |
| `ORG_EMAIL_DOMAIN` | Email domain for auto-created manager accounts (e.g. `aygfoods.com`) |
| `PORT` | Backend port (default `3001`) |

---

## Deployment

The project runs under PM2 on a single VPS.

```bash
# Build and restart backend
cd backend && npm run build && pm2 restart hr-backend

# Build and restart frontend
cd frontend && npm run build && pm2 restart hr-frontend

# View logs
pm2 logs hr-backend
pm2 logs hr-frontend
```
