# TalentFlow — HR Recruitment Frontend

Internal HR Recruitment Management System frontend, built with Next.js 14 App Router.

---

## Tech Stack

- **Next.js 14** (App Router, TypeScript)
- **shadcn/ui** + **Tailwind CSS** — component library & styling
- **NextAuth.js v5** — authentication (session provided by Agent 2)
- **TanStack Query v5** — data fetching, caching, optimistic updates
- **TanStack Table v8** — sortable, filterable, paginated tables
- **React Hook Form** + **Zod** — form validation
- **Recharts** — dashboard charts
- **sonner** — toast notifications
- **date-fns** — date formatting
- **Lucide React** — icons

---

## Prerequisites

- Node.js 18.17+ (required by Next.js 14)
- Backend API running on `http://localhost:3001` (Agent 1)
- Auth config from Agent 2

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
AUTH_SECRET=<generate with: openssl rand -base64 32>
AUTH_URL=http://localhost:3000
```

### 3. Connect Agent 2's auth

Replace `auth.config.ts` with the full NextAuth v5 config from Agent 2. The `authorize` function in `auth.config.ts` should call `POST /api/auth/login` on the backend and return `{ id, name, email, role, accessToken }`.

---

## Run

### Development

```bash
npm run dev
```

App runs at **http://localhost:3000**

### Production build

```bash
npm run build
npm start
```

### Type checking

```bash
npm run type-check
```

---

## Project Structure

```
app/
├── (auth)/login/          # Login page
├── (dashboard)/
│   ├── layout.tsx         # Sidebar + Topbar shell
│   ├── dashboard/         # Stats overview + charts
│   ├── candidates/        # ATS table + filters + drawer
│   │   └── [id]/          # Candidate detail page
│   ├── appointments/      # Booking + calendar view
│   ├── availability/      # Manager availability management
│   └── users/             # User management (Admin only)
components/
├── layout/                # Sidebar, Topbar
├── candidates/            # CandidatesTable, CandidateDrawer, AddCandidateModal, etc.
├── appointments/          # AppointmentsTable, BookAppointmentModal, etc.
├── availability/          # AvailabilityTable, AvailabilityModal
├── shared/                # DataTable, RoleGuard, StatusBadge, ConfirmDialog
└── ui/                    # Radix-based UI primitives (Button, Dialog, Badge)
hooks/
├── useCandidates.ts       # All candidate query + mutation hooks
├── useAppointments.ts     # All appointment hooks
└── useAvailability.ts     # All availability hooks
lib/
├── api.ts                 # Axios instance with auth header injection
├── queryClient.ts         # TanStack Query client
└── utils.ts               # cn(), formatDate(), downloadCSV(), etc.
types/
├── index.ts               # Candidate, Appointment, ManagerAvailability, etc.
└── next-auth.d.ts         # Session type augmentation
```

---

## Role-Based Access

| Feature                  | ADMIN | MANAGER | HR  |
|--------------------------|-------|---------|-----|
| View candidates          | ✅    | ✅      | ✅  |
| Add / Edit candidate     | ✅    | ✅      | ✅  |
| Delete candidate         | ✅    | ❌      | ❌  |
| Bulk delete candidates   | ✅    | ❌      | ❌  |
| Export CSV               | ✅    | ✅      | ❌  |
| View appointments        | ✅    | ✅      | ✅  |
| Book appointment         | ✅    | ✅      | ✅  |
| Edit / Cancel appt.      | ✅    | ✅      | ❌  |
| View availability        | ✅    | ✅      | ✅  |
| Add / Edit availability  | ✅    | ✅      | ❌  |
| Delete availability      | ✅    | ❌      | ❌  |
| User management          | ✅    | ❌      | ❌  |

---

## Key Design Decisions

### Optimistic Updates
Status changes and availability toggles use TanStack Query's optimistic update pattern — the UI updates instantly and rolls back on error.

### Candidate Drawer
Clicking any candidate row opens a slide-in drawer (`CandidateDrawer`) with the full AI review, transcript, and inline status change. The `/candidates/[id]` detail page exists for direct linking.

### API Auth
`lib/api.ts` attaches `Authorization: Bearer <token>` on every request using a request interceptor. The token comes from the NextAuth session (`session.accessToken`).

### Empty & Loading States
Every table uses skeleton loaders (not spinners) while loading, and a contextual empty state when no data is found.

---

## Expected Backend API Endpoints

```
GET    /api/dashboard/stats
GET    /api/candidates              ?search, status, aiRecommendation, location, postingName, dateFrom, dateTo, page, limit, sortBy, sortOrder
POST   /api/candidates
GET    /api/candidates/:id
PATCH  /api/candidates/:id
DELETE /api/candidates/:id
POST   /api/candidates/bulk-delete  { ids: string[] }
GET    /api/candidates/meta/locations
GET    /api/candidates/meta/postings

GET    /api/appointments            ?date, dateFrom, dateTo, location, managerName, page, limit
POST   /api/appointments
PATCH  /api/appointments/:id
GET    /api/appointments/meta/locations
GET    /api/appointments/meta/managers
GET    /api/availability/slots      ?date, location

GET    /api/availability            ?location, managerName, active
POST   /api/availability
PATCH  /api/availability/:id
DELETE /api/availability/:id

GET    /api/users
POST   /api/users
DELETE /api/users/:id

POST   /api/auth/login              { email, password } → { accessToken, user: { id, name, email, role } }
```

---

## Troubleshooting

**`AUTH_SECRET` error on startup**
Generate one: `openssl rand -base64 32` and add to `.env.local`

**API calls returning 401**
Ensure Agent 2's `authorize` function returns `accessToken` in the user object, and the JWT callback is forwarding it to the session.

**Hydration errors**
Make sure client components that use `useSession()` are marked `'use client'` and wrapped in `<SessionProvider>`.
