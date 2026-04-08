# AYG HR Automation — Full Handover Document

**Project:** TalentFlow HR Recruitment Platform  
**Company:** AYG Foods  
**Server IP:** `46.62.166.147`  
**Last Updated:** April 8, 2026

---

## 1. What Was Built

A full internal HR Recruitment Platform with three layers:

| Layer | Technology | Domain | Port (internal) |
|---|---|---|---|
| Frontend | Next.js 14 (App Router) | https://hr.aygfoods.com | 3000 |
| Backend API | Express.js + Prisma | https://hr-api.aygfoods.com | 3001 |
| Database | PostgreSQL 16 | localhost only | 5432 |
| Automation | n8n (pre-existing) | — | 5678 |

### Features
- Microsoft Azure AD SSO login (only `@aygfoods.com` emails)
- Role-based access control: `ADMIN`, `MANAGER`, `HR`
- Candidate pipeline management
- Appointment scheduling
- Interviewer availability management
- User management (Admin only)
- Auto-provisioning of new org users on first login (assigned `HR` role)
- n8n API key integration for automation workflows

---

## 2. Server Setup

**OS:** Ubuntu 24.04 LTS  
**Node.js:** v20 (LTS)  
**Process Manager:** PM2  
**Reverse Proxy:** Nginx  
**SSL:** Let's Encrypt (auto-renews every 90 days)  
**Firewall:** UFW

### Firewall Rules
```
22   SSH     ALLOW
80   HTTP    ALLOW  (redirects to HTTPS via Nginx)
443  HTTPS   ALLOW
3000 Next.js DENY   (internal only)
3001 Express DENY   (internal only)
```

### Process Manager (PM2)
```bash
pm2 list                    # view all running processes
pm2 logs hr-backend         # backend logs
pm2 logs hr-frontend        # frontend logs
pm2 restart hr-backend      # restart backend
pm2 restart hr-frontend     # restart frontend
pm2 save                    # save process list (survives reboots)
```

---

## 3. File Locations on Server

| What | Path |
|---|---|
| Full project | `~/ayg-hr-automation/` |
| Backend source | `~/ayg-hr-automation/backend/` |
| Backend env | `~/ayg-hr-automation/backend/.env` |
| Backend built files | `~/ayg-hr-automation/backend/dist/` |
| Backend PM2 config | `~/ayg-hr-automation/backend/ecosystem.config.js` |
| Backend logs | `~/ayg-hr-automation/backend/logs/` |
| Frontend source | `~/ayg-hr-automation/frontend/` |
| Frontend env | `~/ayg-hr-automation/frontend/.env.local` |
| Frontend built files | `~/ayg-hr-automation/frontend/.next/` |
| Nginx config | `/etc/nginx/sites-available/ayg-hr` |
| SSL certificates | `/etc/letsencrypt/live/hr.aygfoods.com/` |
| Database | PostgreSQL, db name: `hr_recruitment` |

---

## 4. Environment Variables

### Backend — `~/ayg-hr-automation/backend/.env`
```env
DATABASE_URL=postgresql://hr_user:hr_secure_pass@localhost:5432/hr_recruitment
PORT=3001
NODE_ENV=production
AZURE_CLIENT_ID=9c695515-4935-4277-9046-4f0295bcd10c
AZURE_TENANT_ID=349ccba7-3332-4fd1-a02b-d5adacddbedb
AZURE_CLIENT_SECRET=<your-secret>
AZURE_JWKS_URI=https://login.microsoftonline.com/349ccba7-3332-4fd1-a02b-d5adacddbedb/discovery/v2.0/keys
ORG_EMAIL_DOMAIN=aygfoods.com
N8N_API_KEY=<your-n8n-api-key>
FRONTEND_URL=https://hr.aygfoods.com
```

> ⚠️ `FRONTEND_URL` must be set in the backend `.env` for CORS to work. After adding it, rebuild and restart the backend.

### Frontend — `~/ayg-hr-automation/frontend/.env.local`
```env
AZURE_CLIENT_ID=9c695515-4935-4277-9046-4f0295bcd10c
AZURE_CLIENT_SECRET=<your-secret>
AZURE_TENANT_ID=349ccba7-3332-4fd1-a02b-d5adacddbedb
ORG_EMAIL_DOMAIN=aygfoods.com
NEXT_PUBLIC_ORG_DOMAIN=aygfoods.com
NEXT_PUBLIC_COMPANY_NAME=AYG Foods
BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_BACKEND_URL=https://hr-api.aygfoods.com
NEXTAUTH_URL=https://hr.aygfoods.com
AUTH_SECRET=<random-32-char-string>
```

---

## 5. Azure AD Configuration

**App Name:** HR app  
**Tenant ID:** `349ccba7-3332-4fd1-a02b-d5adacddbedb`  
**Client ID:** `9c695515-4935-4277-9046-4f0295bcd10c`  
**Portal:** https://portal.azure.com → App registrations → HR app

### Redirect URIs (must be set in Azure Portal → Authentication)
```
https://hr.aygfoods.com/api/auth/callback/microsoft-entra-id
```

### Required API Permissions (Microsoft Graph — Delegated)
- `openid`
- `profile`
- `email`
- `offline_access`

### Client Secret Expiry
The client secret expires on a set date. Go to **Certificates & secrets** to check and rotate before it expires (set a calendar reminder).

---

## 6. Database

```bash
# Connect to database
sudo -u postgres psql hr_recruitment

# Run migrations (after any schema change)
cd ~/ayg-hr-automation/backend
npx prisma migrate deploy

# View database schema
cat ~/ayg-hr-automation/backend/prisma/schema.prisma
```

**Credentials:**
- User: `hr_user`
- Password: `hr_secure_pass`
- Database: `hr_recruitment`
- Host: `localhost:5432`

---

## 7. API Reference

**Base URL:** `https://hr-api.aygfoods.com`

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| GET | `/health` | No | Health check |
| GET | `/api/candidates` | Yes | List all candidates |
| POST | `/api/candidates` | Yes | Add candidate |
| GET | `/api/candidates/:id` | Yes | Get candidate detail |
| PATCH | `/api/candidates/:id` | Yes | Update candidate |
| GET | `/api/appointments` | Yes | List appointments |
| POST | `/api/appointments` | Yes | Book appointment |
| GET | `/api/availability` | Yes | List availability slots |
| POST | `/api/availability` | Yes | Add availability |
| GET | `/api/users` | ADMIN only | List all users |
| PATCH | `/api/users/:id/role` | ADMIN only | Change user role |
| PATCH | `/api/users/:id/deactivate` | ADMIN only | Deactivate user |
| GET | `/api/auth/me` | Yes | Get current user |

**n8n automation** — use `X-API-Key: <N8N_API_KEY>` header instead of Bearer token.

---

## 8. Deployment — How to Update

### Update backend code
```bash
cd ~/ayg-hr-automation
git pull origin master
cd backend
npm install
npm run build
npx prisma migrate deploy   # only if schema changed
pm2 restart hr-backend
```

### Update frontend code
```bash
cd ~/ayg-hr-automation
git pull origin master
cd frontend
npm install
npm run build
pm2 restart hr-frontend
```

### Renew SSL (automatic, but manual if needed)
```bash
certbot renew
systemctl reload nginx
```

---

## 9. Role Management

First-time `@aygfoods.com` users are auto-created with the `HR` role.

To promote a user to ADMIN or MANAGER:
1. Log in as an existing ADMIN
2. Go to **Dashboard → User Management**
3. Change the role from the dropdown

Or directly via API:
```bash
curl -X PATCH https://hr-api.aygfoods.com/api/users/<USER_ID>/role \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"role": "ADMIN"}'
```

---

## 10. Known Issues & Next Steps

| Issue | Status | Fix |
|---|---|---|
| Dashboard shows no data | Open | Add `FRONTEND_URL=https://hr.aygfoods.com` to backend `.env`, rebuild backend |
| Login redirects to dashboard without SSO | Open | Middleware fix deployed — needs frontend rebuild to take effect |
| "Unknown" user in sidebar | Open | Will resolve once proper Microsoft SSO login is completed |
| Sign Out not working | Open | Will resolve once session is created via proper SSO login |

### Immediate action required
```bash
# 1. Add FRONTEND_URL to backend env (fixes CORS + data loading)
echo "FRONTEND_URL=https://hr.aygfoods.com" >> ~/ayg-hr-automation/backend/.env
pm2 restart hr-backend

# 2. Rebuild frontend with latest middleware fix
cd ~/ayg-hr-automation/frontend && npm run build && pm2 restart hr-frontend

# 3. Test login at https://hr.aygfoods.com/login in an incognito window
```

---

## 11. Monitoring & Troubleshooting

### Check all services
```bash
pm2 list
systemctl status nginx
systemctl status postgresql
```

### View logs
```bash
pm2 logs hr-backend --lines 100
pm2 logs hr-frontend --lines 100
tail -f /var/log/nginx/error.log
```

### If backend crashes
```bash
cd ~/ayg-hr-automation/backend
node --env-file=.env dist/index.js    # run directly to see error
pm2 restart hr-backend
```

### If frontend crashes
```bash
cd ~/ayg-hr-automation/frontend
npm run build                          # rebuild if needed
pm2 restart hr-frontend
```

### If database connection fails
```bash
systemctl status postgresql
systemctl restart postgresql
```

---

## 12. Git Repository

**GitHub:** https://github.com/asimilaladil/ayg-hr-automation  
**Branch:** `master`

The `.env` files are gitignored and NOT in the repository. Keep them backed up securely.

---

## 13. Security Checklist

- [x] Ports 3000 and 3001 blocked externally (UFW)
- [x] SSL/HTTPS enabled on both domains
- [x] Only `@aygfoods.com` emails can log in (enforced at Azure + backend)
- [x] n8n API key required for automation access
- [x] Role-based access control on all API routes
- [ ] Rotate `AUTH_SECRET` to a proper random value: `openssl rand -base64 32`
- [ ] Rotate `AZURE_CLIENT_SECRET` before expiry
- [ ] Set up database backups (pg_dump cron job recommended)
- [ ] Set up server monitoring (e.g. UptimeRobot for https://hr.aygfoods.com)

---

*Document generated April 8, 2026*
