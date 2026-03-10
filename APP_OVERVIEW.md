# Remote Days — Application Overview

## What It Is

Remote Days is a cross-border remote work compliance tracking application for Luxembourg-based companies. It solves a specific legal problem: employees who live in France, Belgium, or Germany but work in Luxembourg must not exceed a threshold of remote working days per year from their home country, or they trigger tax and social security obligations in that country.

The app tracks daily work location declarations, calculates compliance status against thresholds, and alerts HR before limits are breached.

---

## Business Context

### Why This Exists

Luxembourg has bilateral social security and tax treaties with its neighbours. An employee living in France who works remotely more than 34 days/year from France can trigger French social security obligations for both the employee and employer. Same applies to Belgium (34 days). Germany has a higher threshold (183 days). Companies need visibility and tracking to remain compliant.

### User Roles

| Role | What They Do |
|------|-------------|
| **employee** | Declares daily location (home/office), views own compliance status, creates change requests |
| **hr** | Views all employees, approves/rejects change requests, overrides entries, sees risk reports |
| **admin** | Everything HR can do, plus: user management, country thresholds, audit logs, notifications, holidays |

### Compliance Thresholds

| Country | Max Remote Days/Year | Status Levels |
|---------|---------------------|---------------|
| France (FR) | 34 days | safe < 75% → warning 75-90% → critical 90-100% → exceeded > 100% |
| Belgium (BE) | 34 days | same |
| Germany (DE) | 183 days | same |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Clients                                  │
│   Web (React 19)          Mobile (React Native/Expo)            │
│   Cloudflare Pages        iOS / Android                         │
└──────────────┬──────────────────────────┬───────────────────────┘
               │                          │
               │ HTTPS + httpOnly cookies │ HTTPS + Bearer tokens
               │                          │
┌──────────────▼──────────────────────────▼───────────────────────┐
│                    API (Fastify on EC2 + PM2)                    │
│   - REST API with OpenAPI/Swagger docs                          │
│   - JWT authentication (cookies for web, tokens for mobile)     │
│   - Rate limiting, CORS, security headers                       │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                  PostgreSQL (Neon, serverless)                   │
│   - entries, users, audit_logs, requests, country_thresholds    │
│   - email_cta_tokens, holidays, push_tokens, login_attempts     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Monorepo Structure

```
remote-days/
├── apps/
│   ├── api/          # Fastify backend (@remotedays/api)
│   ├── web/          # React 19 frontend (@remotedays/web)
│   └── mobile/       # React Native/Expo app (@remotedays/mobile)
├── packages/
│   ├── types/        # Shared TypeScript types (@remotedays/types)
│   └── shared/       # Shared business logic (@remotedays/shared)
├── landing/          # Static marketing landing page
├── docker/           # PostgreSQL init.sql (schema), pgAdmin config
└── scripts/          # Deployment and utility scripts
```

---

## Backend API (`apps/api`)

**Stack:** Fastify 4 + TypeScript + PostgreSQL (raw SQL, no ORM)

### Architecture Pattern: Repository → Service → Controller

```
Request → Route → preHandler (auth) → Controller → Service → Repository → DB
```

### Key File Locations

| Layer | Path |
|-------|------|
| Entry point | `src/server.ts` |
| App setup | `src/app.ts` |
| Route registration + DI | `src/api-routes.ts` |
| Auth middleware | `src/plugins/auth.ts` |
| Database plugin | `src/db.ts` |
| Error classes | `src/errors/` |
| Environment config | `src/config/env.ts` |

### Route Groups

| Prefix | Auth Required | Description |
|--------|--------------|-------------|
| `/auth/*` | Varies | Login, logout, profile, password reset |
| `/entries/*` | Employee+ | Daily declarations, stats |
| `/cta/:token/*` | None (token-based) | One-click email link handler |
| `/requests/*` | Employee+ | Change request creation/viewing |
| `/hr/*` | HR+ | Employee summaries, risk analysis |
| `/admin/*` | HR+ or Admin | User mgmt, countries, audit, holidays |
| `/lead` | None | Marketing lead capture |

### Authentication

- **Web:** JWT stored in httpOnly cookie (`token`)
- **Mobile:** JWT in `Authorization: Bearer {token}` header
- Plugin checks both, attaches `request.user` to every authenticated request
- Decorators: `fastify.authenticate`, `fastify.authorize('hr' | 'admin')`

### Database Schema (Key Tables)

| Table | Purpose |
|-------|---------|
| `users` | User accounts with role, country, preferences |
| `entries` | Daily work location declarations (unique per user per day) |
| `audit_logs` | Immutable log of all entry changes with actor/reason |
| `requests` | Employee change requests awaiting HR approval |
| `country_thresholds` | Configurable max remote days per country |
| `holidays` | Days to skip for notifications (per country or global) |
| `email_cta_tokens` | One-click email link tokens (UUID, 24h TTL, single-use) |
| `push_tokens` | Mobile device push notification registrations |
| `login_attempts` | Failed login tracking for account lockout |
| `security_events` | Security audit trail |

### Email / CTA Workflow

1. Daily cron (08:00 CET, skip weekends/holidays) generates UUID tokens per user
2. Emails sent with two buttons: "I worked from Home" / "I was at the Office"
3. Links: `https://app.remotedays.app/cta?token={uuid}&action=home`
4. Backend validates token → creates entry → marks token used
5. Tokens expire after 24h and can only be used once

---

## Frontend Web (`apps/web`)

**Stack:** React 19 + Vite 7 + React Router v7 + TanStack Query v5 + Tailwind CSS + Radix UI

### Key File Locations

| Type | Path |
|------|------|
| Route definitions | `src/App.tsx` |
| Auth state | `src/context/AuthContext.tsx` |
| API client (axios) | `src/lib/api.ts` |
| Route guards | `src/components/ProtectedRoute.tsx` |
| Dashboard layout | `src/layouts/DashboardLayout.tsx` |
| Pages | `src/pages/` |
| Reusable components | `src/components/` |
| Radix UI primitives | `src/components/ui/` |

### Page Structure

```
/ (Home — role-based: Dashboard for employees, EmployeeSummary for HR)
├── /login, /forgot-password, /reset-password (public)
├── /cta (public — handles one-click email links)
├── /legal/* (public — privacy, terms, cookies)
├── /calendar, /compliance, /requests (employee+)
├── /hr, /hr/employees, /hr/employees/:id (hr+)
└── /admin/* (admin — users, countries, audit, notifications, holidays)
```

### Auth Flow

1. `AuthContext` calls `/auth/me` via TanStack Query on mount
2. Credentials in httpOnly cookies (set by API on login)
3. `ProtectedRoute` checks `user?.role` before rendering
4. Logout clears query cache and cookie via `/auth/logout`

---

## Mobile App (`apps/mobile`)

**Stack:** React Native 0.76.5 + Expo 52 + Expo Router 4

**Constraints:**
- React **18.3.1** (not 19 — React Native requirement)
- No `react-dom` or `react-native-web`
- **Employee-only** — blocks HR and Admin logins

### Key File Locations

| Type | Path |
|------|------|
| Root layout | `app/_layout.tsx` |
| Auth context | `context/AuthContext.tsx` |
| API client | `services/api.ts` |
| Tab screens | `app/(tabs)/` |
| Auth screens | `app/(auth)/` |

### Authentication

- Token stored in `expo-secure-store` (OS-level encryption)
- All API calls include `Authorization: Bearer {token}`
- 401 responses trigger automatic logout via event emitter

### Key Features

- Offline queue (AsyncStorage) — retries failed declarations on reconnect
- Push notifications via Expo Notifications
- Deep link handling for email CTA links
- Haptic feedback on declaration actions

---

## Shared Packages

### `@remotedays/types` (`packages/types/index.ts`)

Pure TypeScript interfaces only. No logic, no dependencies. Used by all apps.

Key types: `User`, `AuthUser`, `UserRole`, `Entry`, `work_status`, `ComplianceStatus`, `EmployeeStats`, `EntryRequest`, `AuditLog`, `CountryThreshold`, `Holiday`

### `@remotedays/shared` (`packages/shared/index.ts`)

Platform-agnostic business logic. Used by Web and Mobile (not API — API has its own calculations).

```typescript
getComplianceStatus(count, limit)  // → 'safe' | 'warning' | 'critical' | 'exceeded'
getDaysRemaining(count, limit)     // → number
getPercentageUsed(count, limit)    // → 0-100

formatDate(date)       // → "Jan 01, 2024"
formatDateShort(date)  // → "Jan 01"
isToday(date)          // → boolean
isSameDay(d1, d2)      // → boolean

COMPLIANCE_LIMITS      // { FR: 34, BE: 34, DE: 183 }
API_CONFIG             // { baseURL, timeout }
```

---

## Key Workflows

### Daily Declaration (Employee)

1. Employee logs in (web or mobile)
2. Dashboard shows current compliance status (days used / limit, traffic light)
3. Employee clicks "Home" or "Office" for today
4. Entry created in DB, compliance stats updated
5. If no declaration by 08:00, cron job sends email with one-click buttons

### Change Request Workflow

1. Employee submits change request (different date, different status + reason)
2. HR sees request in `/admin/requests` (pending badge)
3. HR approves → entry created / overridden in DB, employee notified
4. HR rejects → request closed with note, employee notified
5. All changes logged in `audit_logs`

### HR Risk View

- Dashboard shows all employees grouped by compliance status
- Risk distribution: how many safe / warning / critical / exceeded
- Daily snapshot: who declared what today
- Can drill into any employee's full history

---

## Security

| Feature | Implementation |
|---------|---------------|
| Password hashing | bcrypt (10+ rounds) |
| Session management | JWT in httpOnly cookies (web) / SecureStore (mobile) |
| Auth endpoints | Rate limited (5 req/min for login, 3/15min for password reset) |
| Account lockout | Failed attempts tracked per email+IP in `login_attempts` |
| SQL injection | Parameterized queries via `pg` driver |
| CORS | Whitelist in `src/app.ts` |
| Security headers | `@fastify/helmet` |
| Audit trail | All entry mutations logged with actor, before/after, reason |

---

## Deployment

| Component | Platform | Build Output |
|-----------|----------|-------------|
| API | EC2 + PM2 | `dist/server.js` (tsup single-file CJS bundle) |
| Web | Cloudflare Pages | `apps/web/dist` (Vite build with PWA) |
| Mobile | EAS Build | iOS/Android native binaries |
| Database | Neon (serverless PostgreSQL) | N/A |

### Deploy API

```bash
npm run build:api          # → dist/server.js
bash scripts/deploy.sh     # Pulls, builds, restarts PM2
```

### Deploy Web

```bash
npm run build:web          # → apps/web/dist
# Cloudflare Pages auto-deploys from git push
```

---

## Environment Variables

```bash
# Required for API
DATABASE_URL=postgresql://user:pass@host/db
JWT_SECRET=min-32-chars-random-string
JWT_EXPIRATION=1d
PORT=3000
HOST=0.0.0.0
NODE_ENV=production
APP_URL=https://app.remotedays.app
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_SECURE=false
EMAIL_FROM=noreply@remotedays.app

# Web
VITE_API_URL=https://api.remotedays.app

# Mobile
EXPO_PUBLIC_API_URL=https://api.remotedays.app
```

---

## Local Development

```bash
# Prerequisites: Docker Desktop, Node 20+, npm 10+

docker-compose up       # Starts: DB, API, Web, Mailpit, seeds test data

# Or individually:
npm run dev:api         # http://localhost:3000
npm run dev:web         # http://localhost:5173

# Test accounts (after seeding)
# admin@remotedays.app / password123
# hr@remotedays.app / password123
# employee1@remotedays.app / password123

# API docs (Swagger UI)
# http://localhost:3000/documentation

# Email preview (Mailpit)
# http://localhost:8025
```

---

## Testing

```bash
npm run test --workspace=@remotedays/api          # Vitest unit tests
npm run test:e2e --workspace=@remotedays/web       # Playwright E2E
```

- API unit tests use Testcontainers (ephemeral PostgreSQL per test suite)
- E2E tests cover auth flow, admin features, employee workflows
- Test files: `apps/api/src/**/__tests__/*.spec.ts`, `apps/web/e2e/*.spec.ts`
