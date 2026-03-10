# AGENTS.md

Guidance for Codex when working in this repository.

For a full application description, see [APP_OVERVIEW.md](APP_OVERVIEW.md).

---

## Project

Remote Days is a cross-border remote work compliance tracker for Luxembourg-based companies. Employees declare daily work location (home/office); the app tracks days against country thresholds (FR=34, BE=34, DE=183) and alerts HR before limits are breached.

**Package scope:** Always `@remotedays/*`. Never use the old `@tracker/*` naming.

---

## Monorepo Structure

```
apps/
├── api/      # Fastify backend      (@remotedays/api)
├── web/      # React 19 frontend    (@remotedays/web)
└── mobile/   # React Native/Expo    (@remotedays/mobile)

packages/
├── types/    # Shared TS interfaces  (@remotedays/types)
└── shared/   # Shared business logic (@remotedays/shared)
```

---

## Common Commands

```bash
# Development
npm run dev:api          # API on :3000
npm run dev:web          # Web on :5173
npm run dev:mobile       # Expo
docker-compose up        # Full stack with seeded DB

# Build
npm run build:api        # → apps/api/dist/server.js
npm run build:web        # → apps/web/dist

# Test
npm run test --workspace=@remotedays/api        # Vitest (unit)
npm run test:e2e --workspace=@remotedays/web    # Playwright (E2E)

# Database
npm run db:seed --workspace=@remotedays/api
npm run db:seed:zones --workspace=@remotedays/api

# Deploy API
bash scripts/deploy.sh
```

---

## Architecture

### Backend (`apps/api/src/`)

**Pattern:** Repository → Service → Controller (Fastify)

| Layer | Location |
|-------|----------|
| Entry point | `server.ts` |
| App/plugin setup | `app.ts` |
| Route registration + DI | `api-routes.ts` |
| Auth middleware | `plugins/auth.ts` |
| DB plugin | `db.ts` |
| Feature routes | `{feature}/{feature}.routes.ts` |
| Feature controllers | `{feature}/{feature}.controller.ts` |
| Services | `services/{feature}.service.ts` |
| Repositories | `repositories/{feature}.repository.ts` |
| Error classes | `errors/` |
| Config | `config/env.ts` |

**Database:** PostgreSQL with raw SQL (`fastify.pg.query()`). No ORM. Schema in `docker/postgres/init.sql`. No automated migrations — add schema changes to init.sql and reset with `docker-compose down -v && docker-compose up`.

**Auth plugin** (`plugins/auth.ts`):
- Checks httpOnly cookie `token` OR `Authorization: Bearer {token}` header
- Attaches `request.user` (full User from DB)
- `fastify.authenticate` — requires valid JWT
- `fastify.authorize('hr' | 'admin')` — role check

**Error handling:** Use custom classes from `errors/`. Always return proper HTTP status codes with user-friendly messages.

**Logging:** Use `fastify.log.info()` (Pino). Never `console.log`.

### Frontend (`apps/web/src/`)

**Stack:** React 19 + Vite + React Router v7 + TanStack Query v5 + Tailwind CSS + Radix UI

| Type | Location |
|------|----------|
| Routes | `App.tsx` |
| Auth state | `context/AuthContext.tsx` (`useAuth()` hook) |
| API client | `lib/api.ts` (axios with `withCredentials`) |
| Route guards | `components/ProtectedRoute.tsx` |
| Pages | `pages/` |
| Components | `components/` |
| Radix primitives | `components/ui/` |

**Patterns:**
- Always use axios instance from `lib/api.ts` for API calls
- Use `useAuth()` for auth state
- Use TanStack Query for all server data (caching, refetch)
- Forms: React Hook Form + Zod

### Mobile (`apps/mobile/`)

**Stack:** React Native 0.76.5 + Expo 52 + Expo Router 4 (file-based routing)

**Hard constraints:**
- React **18.3.1** — never upgrade to 19 (React Native requirement)
- No `react-dom`, no `react-native-web`
- **Employee-only** — rejects HR/Admin logins at app level

| Type | Location |
|------|----------|
| Root layout | `app/_layout.tsx` |
| Tab screens | `app/(tabs)/` |
| Auth screens | `app/(auth)/` |
| Auth context | `context/AuthContext.tsx` |
| API client | `services/api.ts` (Bearer token) |

**Auth:** Token in `expo-secure-store`. All requests use `Authorization: Bearer {token}`. 401s trigger logout via event emitter in `services/authEvents.ts`.

### Shared Packages

**`@remotedays/types`** — Pure TS interfaces only. No logic, no imports from other packages. Used by all apps.

**`@remotedays/shared`** — Platform-agnostic logic. Used by Web + Mobile (not API). Key exports:
- `getComplianceStatus(count, limit)` → `'safe' | 'warning' | 'critical' | 'exceeded'`
- `getDaysRemaining(count, limit)`, `getPercentageUsed(count, limit)`
- `formatDate()`, `formatDateShort()`, `isToday()`, `isSameDay()`
- `COMPLIANCE_LIMITS` = `{ FR: 34, BE: 34, DE: 183 }`
- `API_CONFIG` = `{ baseURL, timeout }`

---

## Code Rules

### Dependency Management

- **TypeScript:** Always root version (5.9.0). Never add to individual packages.
- **React:** Web=19.2.0, Mobile=18.3.1. Keep separate. Do not mix.
- **Adding packages:** 2+ apps → root `package.json`. Single app → that app's `package.json`. Dev-only → `devDependencies`.

### Type Safety

- No `any` types. Use proper TypeScript.
- Import shared types: `import { User } from '@remotedays/types'`
- Import shared logic: `import { getComplianceStatus } from '@remotedays/shared'`

### API Controller Pattern

```typescript
export const someController = async (
  request: FastifyRequest<{ Body: SomeBodyType }>,
  reply: FastifyReply
) => {
  const result = await someService.doSomething(request.body);
  return reply.code(200).send(result);
};
```

### Protecting Routes

```typescript
fastify.get('/admin/users', {
  preHandler: [fastify.authenticate, fastify.authorize('admin')]
}, adminController.getUsers);
```

### DB Queries

```typescript
const { rows } = await fastify.pg.query<User>(
  'SELECT * FROM users WHERE user_id = $1',
  [userId]
);
```

Always use parameterized queries. Never interpolate user input into SQL strings.

---

## Business Logic

### Compliance Calculation

Counts `status = 'home'` entries for current calendar year per user, compares to country threshold:

| Percentage of threshold | Status |
|------------------------|--------|
| < 75% | `safe` |
| 75–90% | `warning` |
| 90–100% | `critical` |
| > 100% | `exceeded` |

### User Roles

| Role | Permissions |
|------|------------|
| `employee` | Own data, declare entries, create change requests |
| `hr` | All employees, approve requests, override entries, risk reports |
| `admin` | Everything + user management, country config, audit logs, holidays |

### Change Request Flow

1. Employee POSTs to `/requests` (date, status, reason)
2. HR sees pending requests at `/admin/requests`
3. HR POSTs to `/admin/requests/:id/process` (approved/rejected + note)
4. If approved: entry created/overridden; employee notified

### One-Click Email (CTA)

1. Daily cron (08:00 CET, skip weekends/holidays) creates `email_cta_tokens` and sends emails
2. User clicks link → `/cta?token=...&action=home` → frontend calls `POST /cta/:token/home`
3. Token validated (not expired, not used), entry created, token marked used

### Audit Trail

Every entry mutation logged in `audit_logs` with: actor, target user, action type, old/new status, reason, timestamp.

---

## Common Gotchas

1. **Mobile auth:** Mobile uses Bearer tokens, not cookies. Any new API endpoint accessed by mobile must support both.

2. **Date handling:** Store in UTC in DB. Use `date-fns-tz` with `Europe/Paris` for display and cron logic. Never use `new Date()` directly for timezone-sensitive operations.

3. **CORS:** When adding new frontend origins, update the whitelist in `apps/api/src/app.ts`.

4. **Shared package changes:** Restart all dev servers after modifying `packages/types` or `packages/shared`.

5. **DB schema changes:** Edit `docker/postgres/init.sql`, then `docker-compose down -v && docker-compose up` to apply.

6. **Mobile routing:** Expo Router uses file-based routing. Directory structure = URL structure.

7. **Worker dependencies:** `admin.routes.ts` imports from `worker/email-job.manager`. If worker files are removed or moved, update this import.

---

## Environment Variables

```bash
# API (root .env)
DATABASE_URL=postgresql://user:pass@host/db
JWT_SECRET=32-char-minimum-random-string
JWT_EXPIRATION=1d
PORT=3000
HOST=0.0.0.0
NODE_ENV=development
APP_URL=https://app.remotedays.app
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_SECURE=false
EMAIL_FROM=noreply@remotedays.app

# Web
VITE_API_URL=https://api.remotedays.app

# Mobile
EXPO_PUBLIC_API_URL=http://localhost:3000
```

---

## Deployment

| App | Platform | Build |
|-----|----------|-------|
| API | EC2 + PM2 (`ecosystem.config.js`) | `npm run build:api` → `dist/server.js` |
| Web | Cloudflare Pages | `npm run build:web` → `apps/web/dist` |
| Mobile | EAS Build | `npx eas build --platform ios/android` |
| DB | Neon (serverless PostgreSQL) | — |

---

## Local Dev (Docker)

```bash
docker-compose up
# API:       http://localhost:3000
# Web:       http://localhost:5173
# Swagger:   http://localhost:3000/documentation
# Mailpit:   http://localhost:8025

# Test accounts
admin@remotedays.app   / password123
hr@remotedays.app      / password123
employee1@remotedays.app / password123
```

---

## Testing

- **API:** Vitest + Testcontainers (ephemeral PostgreSQL per suite). Tests: `apps/api/src/**/__tests__/*.spec.ts`
- **Web:** Playwright E2E. Tests: `apps/web/e2e/*.spec.ts`
- **Mobile:** No E2E tests currently. Unit tests in `context/__tests__/`
