# Remote Days

**Cross-border remote-work compliance tracking for Luxembourg-based companies.**

[![CI & Deploy](https://github.com/alwin-augustin/remote-days/actions/workflows/ci-deploy.yml/badge.svg)](https://github.com/alwin-augustin/remote-days/actions/workflows/ci-deploy.yml)

Employees declare each day as home office or office. The app counts home days per
employee against a per-country allowance — France 34, Belgium 24 and Germany 183
by default, editable in the app under **Admin → Country Limits** — and gives HR a
traffic-light view of who is approaching or past their limit, with an immutable
audit trail of every change.

> **Reading this after a long break?** This file is the map: what the product
> does, every third-party service we depend on and why, where the environment
> variables live, and how a change reaches production. It was last verified
> against commit `642f73d` on **2026-10-14**. If you change infrastructure,
> update the [Services](#-services-we-use-and-why) and
> [Environment variables](#-environment-variables) tables in the same change.

---

## 📋 Contents

- [Live environments](#-live-environments)
- [What it does](#-what-it-does)
- [Architecture](#-architecture)
- [Services we use, and why](#-services-we-use-and-why)
- [Environment variables](#-environment-variables)
- [Local development](#-local-development)
- [Database and migrations](#-database-and-migrations)
- [Deployment](#-deployment)
- [Email](#-email)
- [Testing](#-testing)
- [Project structure](#-project-structure)
- [Documentation map](#-documentation-map)
- [Known gaps and leftovers](#-known-gaps-and-leftovers)

---

## 🌍 Live environments

One Fly app serves both the API and the web app, which keeps the session cookie
first-party and takes CORS out of the picture. The landing page is the only thing
on Vercel.

| Hostname | What it serves | Hosted on | Notes |
|---|---|---|---|
| `remotedays.app` | Marketing landing page | Vercel (static, `landing/`) | The primary call to action links to the demo |
| `demo.remotedays.app` | The app, for prospects to explore | Fly | Same deployment as `app.`; the landing page links here |
| `app.remotedays.app` | The app | Fly | |
| `api.remotedays.app` | The API (`/v1`) — and the SPA at every other path | Fly | Same app, three hostnames |
| `remotedays.fly.dev` | The app on Fly's own hostname | Fly | Useful when debugging DNS or TLS |

All four are proxied through Cloudflare. Seeded logins are advertised on the
login screen: `admin@remotedays.app`, `hr@remotedays.app` and
`employee@remotedays.app`, all with the password `password123`.

---

## ✨ What it does

### Roles

| Role | Can do |
|---|---|
| `employee` | Declare days, see personal stats, raise change requests |
| `hr` | Everything about all employees: approve/reject requests, override entries, risk views |
| `admin` | Everything above, plus user management, CSV import, country limits, holidays, audit logs, SSO |

### Compliance model

`getComplianceStatus()` in [`packages/shared`](packages/shared/index.ts) maps home
days against the allowance:

| Share of allowance | Status |
|---|---|
| < 75% | `safe` |
| 75–90% | `warning` |
| 90–100% | `critical` |
| over 100% | `exceeded` |

### Feature highlights

- **Daily declaration** of home office / office, with a weekly calendar view
- **One-click email prompts** — a daily cron (08:00 CET, skipping weekends and
  holidays) mails a tokenised link that records a day in one click
- **Change requests** with an HR approval workflow
- **Audit trail** — every entry mutation recorded with actor, old/new value and reason
- **Bulk CSV import** of users, GDPR data export and account deletion
- **Enterprise SSO (OIDC)**, configured per workspace by an admin
- **Installable PWA** — service worker with offline caching and an update prompt

---

## 🏗️ Architecture

```
                              ┌──────────────────────────────┐
   visitors ─────────────────►│  Cloudflare  (DNS + proxy)   │
                              └───────┬───────────────┬──────┘
                                      │               │
                        remotedays.app│               │demo./app./api.remotedays.app
                                      ▼               ▼
                          ┌────────────────┐  ┌────────────────────────────────┐
                          │     Vercel     │  │   Fly.io  (app "remotedays")   │
                          │  landing/      │  │   ONE image, ONE machine:      │
                          │  (static HTML) │  │     /v1/*  → Fastify API       │
                          └────────────────┘  │     /*     → built React SPA   │
                                              └────────┬────────────┬──────────┘
                                        SQL over TLS   │            │   SMTP
                                                       ▼            ▼
                                          ┌─────────────────┐  ┌──────────────────┐
                                          │ Neon PostgreSQL │  │   Brevo relay    │
                                          │ the datastore   │  │  outbound mail   │
                                          └─────────────────┘  └──────────────────┘

  Separately, inbound mail to any @remotedays.app address never touches the app:

     sender ──► hello@remotedays.app ──► Cloudflare Email Routing ──► same Gmail inbox

  GitHub Actions (one workflow):  push to main → typecheck + lint → apply migrations
                                  → deploy to Fly → smoke test → deploy landing to Vercel
```

The SPA is built with **no `VITE_API_URL`** and calls `/v1` relatively, so the same
artifact works on any hostname it is pointed at. That is why `demo.` is the
production app rather than a separate build.

---

## 🔌 Services we use, and why

| Service | Scope | What we use it for | Configured in | If it goes away |
|---|---|---|---|---|
| **Fly.io** | production | Runs the whole app — Fastify API and the built SPA in one image. App `remotedays`, region `ams`, `shared-cpu-1x` / 512 MB, scales to zero when idle | [`fly.toml`](fly.toml), [`apps/api/Dockerfile`](apps/api/Dockerfile), deploy job | Nothing is reachable; there is no second host |
| **Neon** | production | Serverless PostgreSQL, the only datastore. Address passed as `DATABASE_URL` | Fly secret ← GitHub secret; migrations in CI | `/health` reports `db:unreachable` and returns 503 |
| **Brevo** | production | Transactional email over its SMTP relay: daily reminders, HR/notification mail, and landing-page lead notifications | `SMTP_*` secrets + [`email.service.ts`](apps/api/src/services/email.service.ts) | No email at all; the landing contact form returns 500 |
| **Cloudflare** | production | DNS for `remotedays.app`, reverse proxy in front of both Fly and Vercel, and **Email Routing** (catch-all `*@remotedays.app → Gmail`) that makes `noreply@` and `hello@` deliverable | Cloudflare dashboard / API | No DNS. Inbound mail to any `@remotedays.app` address stops |
| **Vercel** | production | Hosts the marketing landing page only | `landing/vercel.json`, `VERCEL_*` secrets | Landing page 404s; the app is unaffected |
| **GitHub Actions** | CI/CD | One workflow does everything: typecheck, lint, database migrations, Fly deploy, smoke test, landing deploy | [`.github/workflows/ci-deploy.yml`](.github/workflows/ci-deploy.yml) | Deploys become manual `flyctl` / `vercel` runs |
| **Google Analytics 4** | production | Traffic analytics on the landing page and the app (`gtag`, measurement ID `G-ZVFT08TLX0`) | inline script in [`landing/index.html`](landing/index.html) and [`apps/web/index.html`](apps/web/index.html) | No analytics. **Currently blocked on the app by our CSP** — see [gaps](#-known-gaps-and-leftovers) |
| **Cookiebot** | production | Cookie-consent banner gating the analytics above | same two files | No consent banner. Also **currently CSP-blocked on the app** |
| **Mailpit** | local only | Catches every outbound email so local runs never send real mail | [`docker-compose.yml`](docker-compose.yml) | Local email silently fails (nothing to view at :8025) |
| **pgAdmin** | local only | Browser GUI for the local PostgreSQL database | `docker-compose.yml`, `docker/pgadmin/` | Use `psql` instead |
| **Testcontainers** | tests | Starts a throwaway PostgreSQL per API test suite, so tests never touch Neon | [`apps/api/vitest.config.ts`](apps/api/vitest.config.ts) | API integration tests cannot run |
| **Playwright** | tests | Browser end-to-end tests for the web app | [`apps/web/e2e`](apps/web/e2e) | No E2E coverage |
| **Postman** | tooling | Saved API collections for manual/exploratory requests | [`postman/`](postman) | Use curl or Swagger instead |
| **Docker Compose** | local only | Brings up the whole stack locally in one command | `docker-compose.yml` | Set up Postgres and Mailpit by hand |

---

## 🔑 Environment variables

Three places hold configuration. **Names only here — never commit or paste values.**

| Where | What it is | How it gets there |
|---|---|---|
| Fly **secrets** | Runtime config for the API and the SPA it serves | Staged by CI from GitHub secrets (`flyctl secrets import --stage`), then applied on deploy |
| Web **build-time** | Baked into the SPA at build time | Docker build args / local `.env` |
| GitHub **secrets** | The single source of truth CI reads to configure everything above | Repository → Settings → Secrets and variables → Actions |

### API runtime (Fly secrets)

| Name | Purpose |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string *(required)* |
| `JWT_SECRET` | Signs session tokens; rotating it signs everyone out *(required)* |
| `JWT_EXPIRATION` | Session lifetime, e.g. `8h` |
| `PORT` | Listen port (pinned to `3000` in `fly.toml`) |
| `HOST` | Bind address |
| `NODE_ENV` | `production` / `development` / `test` |
| `APP_URL` | Public URL of the web app; used for links in email |
| `API_PUBLIC_URL` | Public URL of this API; used to build OIDC `redirect_uri` values |
| `WEB_DIST_PATH` | Override for where the built SPA is read from |
| `SMTP_HOST` | SMTP relay hostname |
| `SMTP_PORT` | Relay port |
| `SMTP_USER` | SMTP login (not the API key) |
| `SMTP_PASS` | SMTP key |
| `SMTP_SECURE` | `true` for implicit TLS (port 465); `false` for STARTTLS |
| `SMTP_FROM` | The `From` header — must be a sender the relay has verified |
| `EMAIL_FROM` | Sender address used in templates and links |
| `LEAD_NOTIFICATION_EMAIL` | Where landing-page contact requests are delivered |
| `DAILY_EMAIL_LIMIT` | Caps daily outbound mail (used when testing quota) |
| `MAX_HOME_DAYS` | Fallback allowance for employees without a country limit |
| `DEMO_SEED_ENABLED` | Turns the nightly demo-data reset on/off (pinned `false` in `fly.toml`) |
| `DEMO_SEED_CRON` | Cron expression for that reset |
| `DEMO_SEED_TIMEZONE` | Timezone the cron expression is read in |
| `DEMO_SEED_RANDOM_SEED` | Fixes the seeder PRNG for reproducible demo data |
| `MOCK_IDP_ISSUER` | **Local SSO mock only** — see `npm run dev:mock-idp` |
| `MOCK_IDP_CLIENT_ID` | Local SSO mock only |
| `MOCK_IDP_CLIENT_SECRET` | Local SSO mock only |
| `MOCK_IDP_TENANT_ID` | Local SSO mock only |
| `MOCK_IDP_EMAIL` | Local SSO mock only |
| `MOCK_IDP_PORT` | Local SSO mock only |

`DATABASE_URL` and `JWT_SECRET` have no defaults: the API refuses to start without
them. Everything else falls back to a development-safe value.

### Web build

| Name | Purpose |
|---|---|
| `VITE_API_URL` | API origin. **Leave unset in production** so the SPA uses relative `/v1` and stays same-origin |

### CI/CD secrets (GitHub Actions)

| Name | Used by |
|---|---|
| `FLY_API_TOKEN` | Fly deploy (prefer an app-scoped deploy token over a personal one) |
| `DATABASE_URL` | Migration job only, so the schema is never behind the code |
| `JWT_SECRET` | Migration job only — imported by config validation, never used to sign |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, `SMTP_FROM`, `EMAIL_FROM`, `LEAD_NOTIFICATION_EMAIL`, `DAILY_EMAIL_LIMIT` | Staged onto Fly on every deploy |
| `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID_LANDING` | Landing deploy |

`APP_URL` and `API_PUBLIC_URL` are **not** secrets — the workflow sets them
literally, because they describe where the app is deployed rather than a
credential. See [`infra/fly/README.md`](infra/fly/README.md) for the one-time Fly
and DNS setup, and [`docs/GITHUB_SETUP.md`](docs/GITHUB_SETUP.md) for the
secret list.

---

## 🚀 Local development

**Prerequisites:** Node.js ≥ 20 and npm ≥ 10 (see `engines` in
[`package.json`](package.json)), Docker with Compose, Git.

```bash
git clone https://github.com/alwin-augustin/remote-days.git
cd remote-days
npm install
cp .env.example .env      # fill in what you need; defaults suit Docker
docker-compose up
```

| URL | What |
|---|---|
| http://localhost:5173 | Web app |
| http://localhost:3000 | API |
| http://localhost:3000/documentation | Swagger UI |
| http://localhost:8025 | Mailpit — every email the app sends lands here |
| http://localhost:5050 | pgAdmin (`admin@remotedays.app` / `admin123`) |

Compose starts `db`, `api`, `web`, `mailpit`, `pgadmin` and a one-shot `seed`
container that loads demo data. On a fresh database, also run the migrations:

```bash
npm run db:migrate --workspace=apps/api
```

**Seeded logins** (`password123`): `admin@remotedays.app`, `hr@remotedays.app`,
`employee@remotedays.app`.

### Running without Docker

```bash
npm run dev:api        # API on :3000
npm run dev:web        # Web on :5173
npm test               # all workspaces
```

Root scripts: `dev:api`, `dev:web`, `build`, `build:api`, `build:web`, `clean`,
`test`. API workspace: `dev`, `build`, `lint`, `test`, `test:coverage`,
`db:migrate`, `db:migrate:status`, `db:migrate:rollback`, `db:seed`,
`db:seed:zones`, `db:seed:demo`, `dev:mock-idp`. Web workspace: `dev`, `build`,
`lint`, `preview`, `test:e2e`.

---

## 🗄️ Database and migrations

PostgreSQL, accessed with raw SQL through `fastify.pg.query()` — **no ORM**. Always
use parameterised queries.

- `docker/postgres/init.sql` bootstraps a local database on first `docker-compose up`
- Forward-only migrations live in [`apps/api/migrations`](apps/api/migrations) as
  `NNN_name.sql` with a matching `.down.sql`
- The runner is `npm run db:migrate --workspace=apps/api` (`:status` to inspect,
  `:rollback` to undo)
- **CI applies migrations on every app change, before deploying** — that is the
  only path that touches the production schema, and nothing is run by hand

`flyctl deploy` deliberately does not migrate: the runner is not in the runtime
image, because `tsup` bundles only `server.ts` and dev dependencies are pruned.

---

## 🚢 Deployment

Push to `main`. [One workflow](.github/workflows/ci-deploy.yml) decides what to do:

| Job | Runs when | Does |
|---|---|---|
| **CI** | always (push + PR) | `npm ci`, typecheck API and web, lint web |
| **Detect changes** | push to `main` | Decides whether `app/**` or `landing/**` changed |
| **Apply migrations** | app changed | `db:migrate:status`, then `db:migrate` against Neon |
| **Deploy app to Fly** | app changed | Stages secrets, `flyctl deploy --remote-only --depot=false`, then smoke-tests |
| **Deploy landing** | `landing/**` changed | `vercel deploy --prod` |
| **Summary** | push to `main` | Writes a pass/fail table to the run summary |

The smoke test asserts more than "something answered": `GET /` must return 200
**and** look like the SPA shell, and `/health` must report `db:ok`. A failure
tails the machine's logs.

There is a manual trigger too: **Actions → CI & Deploy → Run workflow**, with a
"force deploy" input.

Two things worth knowing before you touch this:

- The deploy passes `--depot=false` to use Fly's own remote builder, because
  Depot hangs for this organisation. That is a workaround with a comment in the
  workflow; revisit it.
- Certificates for the custom hostnames are issued by Fly. If issuance ever
  stalls at `Issuing…`, the cause is Cloudflare's proxy blocking the HTTP-01
  challenge — set the record to DNS-only, let it validate, then re-enable the
  proxy. The full procedure is in [`infra/fly/README.md`](infra/fly/README.md).

---

## 📧 Email

All outbound mail goes through the **Brevo SMTP relay** (`smtp-relay.brevo.com`,
port 587 with STARTTLS, so `SMTP_SECURE` stays unset).

Two variables are easy to confuse, and confusing them breaks lead delivery:

| Variable | Holds | Why it matters |
|---|---|---|
| `SMTP_FROM` | The `From` header, e.g. `"Remote Days" <noreply@remotedays.app>` | The relay only accepts a **verified** sender, which is why this is a no-reply address |
| `LEAD_NOTIFICATION_EMAIL` | Where landing-page contact requests are delivered | Deliberately separate: the destination must be a mailbox a human reads, not the no-reply sender |

Neither address is a real mailbox. The zone has Cloudflare Email Routing with a
catch-all, so `hello@remotedays.app` and every other address on the domain land in
the same Gmail inbox.

Mail from `remotedays.app` is **not authenticated** in Brevo: SPF covers Email
Routing only, there is no Brevo DKIM record, and DMARC is `p=none`. Messages are
accepted but unaligned, so a strict provider may file them under spam.
Authenticating the domain in Brevo — the **Brevo code** TXT and **DKIM** records
from Senders, Domains, IPs → Domains — is the fix.

---

## 🧪 Testing

| Suite | Tool | Location | Command |
|---|---|---|---|
| API unit + integration | Vitest (+ Testcontainers PostgreSQL) | `apps/api/src/**/__tests__`, `apps/api/test` | `npm test --workspace=apps/api` |
| Web end-to-end | Playwright | `apps/web/e2e` | `npm run test:e2e --workspace=apps/web` |

CI gates on **typecheck and lint, not tests**: the suite needs Docker for
Testcontainers and currently has pre-existing failures, so `npm test` is not part
of the pipeline. Run it locally before assuming green.

---

## 📁 Project structure

```
remote-days/
├── apps/
│   ├── api/                 # Fastify API + SPA host  (@remotedays/api)
│   │   ├── src/
│   │   │   ├── server.ts    # entry point
│   │   │   ├── app.ts       # plugins, CORS, CSP, security headers, static SPA
│   │   │   ├── api-routes.ts# route registration + dependency wiring
│   │   │   ├── {feature}/   # {feature}.routes.ts + {feature}.controller.ts
│   │   │   ├── services/    # business logic
│   │   │   ├── repositories/# SQL access
│   │   │   ├── plugins/     # auth (JWT cookie or Bearer), db
│   │   │   ├── jobs/        # node-cron work (daily prompts, demo reset)
│   │   │   └── config/      # env parsing/validation
│   │   ├── migrations/      # NNN_name.sql (+ .down.sql)
│   │   └── Dockerfile       # builds the whole workspace → one runtime image
│   └── web/                 # React 19 SPA  (@remotedays/web)
│       ├── src/{pages,components,layouts,context,lib,hooks}
│       └── e2e/             # Playwright specs
├── packages/
│   ├── types/               # shared TS interfaces, no logic  (@remotedays/types)
│   └── shared/              # compliance + date helpers       (@remotedays/shared)
├── landing/                 # marketing page (Vercel)
├── brand/                   # logo SVGs — source of truth for all brand assets
├── docker/postgres/         # local schema bootstrap
├── docs/                    # setup notes
├── infra/fly/               # Fly + DNS runbook
├── scripts/                 # brand asset generation, PDF, EC2 leftovers
└── postman/                 # API collections
```

Backend convention is **Repository → Service → Controller**, and auth is enforced
per route with `preHandler: [fastify.authenticate, fastify.authorize('admin')]`.

---

## 📚 Documentation map

| File | Read it for |
|---|---|
| [`APP_OVERVIEW.md`](APP_OVERVIEW.md) | Full product description, workflows and data model |
| [`AGENTS.md`](AGENTS.md) | Coding conventions for AI agents and humans — **note: it still describes a mobile app that no longer exists** |
| [`infra/fly/README.md`](infra/fly/README.md) | Fly, DNS, certificates, secrets, operational notes |
| [`docs/GITHUB_SETUP.md`](docs/GITHUB_SETUP.md) | Secret list and CI setup |
| [`brand/BRAND.md`](brand/BRAND.md) | Logo usage, colour, clear space, asset map |
| `/documentation` (running API) | Live Swagger UI — the source of truth for endpoints |

---

## ⚠️ Known gaps and leftovers

Honest list, so nobody re-discovers these the hard way:

1. **The demo shares the production database.** `demo.remotedays.app` is the same
   app and same Neon database as `app.remotedays.app`, and the login screen
   publishes an admin password. Fine while the database holds seeded demo data —
   not fine once it holds customers. A separate database (and app) is the fix.
2. **The app's CSP blocks third-party scripts.** `apps/api/src/app.ts` allows
   `script-src 'self'` and `style-src 'self'`, so Cookiebot, Google Tag Manager
   and the Inter webfont from `fonts.googleapis.com` are all refused in the
   browser. Analytics and consent do not run on the app, and the brand font falls
   back. The landing page is unaffected.
3. **Mail from `remotedays.app` is unauthenticated** in Brevo — see [Email](#-email).
4. **`AGENTS.md` and `APP_OVERVIEW.md` are stale.** They still describe
   `apps/mobile` (Expo), EC2 + PM2 and Cloudflare Pages, all removed in `663f2aa`.
   `AGENTS.md` also lists Belgium's allowance as 34; the code says 24.
5. **Retired-platform files are still in the tree:** `ecosystem.config.js` (PM2),
   `scripts/prepare-ec2.sh`, `scripts/deploy.sh`. They are unused.
6. **`--depot=false`** ties every release to Fly's legacy builder.
7. **CI does not run tests**, only typecheck and lint.
8. **No `LICENSE` file** exists, so the project has no declared licence.
9. `VITE_PROXY_TARGET` is set in `docker-compose.yml` but no proxy reads it — the
   Vite config has no `server.proxy` block.
10. The service worker still caches `https://api.remotedays.app/*`, a rule that no
    longer matches now that API calls are same-origin. Harmless, but dead weight.

---

## 🤝 Contributing

1. Branch from `main` (`feat/…`, `fix/…`).
2. Make the change; keep the Repository → Service → Controller layering in the API.
3. Run `npm run build` and the relevant tests, then check typecheck and lint —
   that is exactly what CI will do.
4. Open a PR. Merging to `main` deploys, so treat it as a release.

**House rules:** no `any`; parameterised SQL only; `fastify.log` (never
`console.log`); shared types from `@remotedays/types`; brand assets are generated
from `brand/` with `node scripts/build-brand-assets.mjs` — never hand-edit them.
