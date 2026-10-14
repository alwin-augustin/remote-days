# Deploying Remote Days to Fly.io

One Fly app (`remotedays`) runs everything the users touch: the Fastify API under
`/v1` and the built React SPA at every other path. Deployments happen in CI — this
document is the runbook for the one-time setup and for operating it afterwards.

```
infra/fly/
└── README.md          # this file
fly.toml               # app definition, at the repository root (see below)
apps/api/Dockerfile    # builds the API and the SPA into a single image
```

`fly.toml` lives at the repository root, not in this folder, because
`apps/api/Dockerfile` needs the whole npm workspace as its build context. Always
run `flyctl` from the repository root so the config file and the context agree.

## Why one app instead of two

| Hostname | Served by | Purpose |
|---|---|---|
| `app.remotedays.app` | `remotedays` | The SPA, and the API it calls |
| `api.remotedays.app` | `remotedays` | The same app — kept because the mobile build and the SSO redirect URIs already point here |
| `remotedays.fly.dev` | `remotedays` | Default hostname; used by the CI smoke test |

Serving both from one origin means the browser never makes a cross-origin
request, so there is no CORS in the path and the session cookie is first-party.
The API still runs cross-origin-provisioned cookies (`SameSite=None`), which
works identically on a same-origin deployment — nothing needed changing there.

Two hostnames are attached to the one app rather than one, because registered
OIDC clients and any already-bookmarked links still reference
`api.remotedays.app`. Keeping that hostname alive means those do not have to be
re-registered.

## Cost

Fly has no free tier any more; a new organisation gets a trial of 2 machine-hours
or 7 days, and this account is past that. Everything below is pay-as-you-go.

| Resource | Cost |
|---|---|
| `shared-cpu-1x` 512 MB, running continuously | $3.69/month |
| Same machine **stopped** (which is the normal state) | $0 compute, ~$0.15/GB-month for the rootfs |
| Shared IPv4 + IPv6 | free |
| Custom-domain certificates (first 10) | free |
| Inbound traffic | free |
| Outbound traffic | $0.02/GB (Europe/NA) |

`auto_stop_machines = true` with `min_machines_running = 0` means the machine
stops when nothing is hitting it, so a demo nobody is using costs **pennies a
month**. The trade-off is a cold start of roughly one to three seconds on the
first request after a quiet spell — Node boot plus the first database connection.

To keep one machine warm instead, change `min_machines_running` to `1` in
`fly.toml`: that costs the full $3.69/month but removes every cold start.

Everything else stays where it is: the database is the existing **Neon** project
(no Fly Postgres, so nothing to pay for or operate), and the landing page stays on
Vercel.

## One-time setup — what you have to do

The Fly app, both certificates and the shared IPs already exist. Two things need
your hands:

### 1. Add one GitHub secret

| Secret | How to create it |
|---|---|
| `FLY_API_TOKEN` | `fly tokens create deploy -a remotedays` — copy the whole output including the `FlyV1` prefix |

That is the only new secret. `DATABASE_URL`, `JWT_SECRET`, `EMAIL_FROM`,
`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` and
`DAILY_EMAIL_LIMIT` are already set on the repository and the workflow forwards
them to Fly on every deploy.

Prefer a **deploy token** over a personal token: it is scoped to this app and can
be revoked on its own. See
[Integrating flyctl](https://fly.io/docs/flyctl/integrating/).

`APP_URL` and `API_PUBLIC_URL` are **not** taken from GitHub. The workflow sets
them literally to `https://app.remotedays.app` and
`https://api.remotedays.app`, because they describe where this app is deployed
rather than a secret. That is also why the pre-existing `APP_URL` and `API_URL`
secrets are no longer read, and neither are `EC2_HOST`, `EC2_SSH_KEY`, `EC2_USER`,
`ENV_FILE` or `VERCEL_PROJECT_ID_WEB` — those belong to the retired EC2 and
Vercel-web deployments and can be deleted.

### 2. Create the DNS records in Cloudflare

`remotedays.app` is registered with Cloudflare, so these go in the Cloudflare
dashboard. Both `app.` and `api.` point at the **same** Fly app, which is why
they share one ownership token.

| Type | Name | Target | Notes |
|---|---|---|---|
| CNAME | `app` | `3plw35g.remotedays.fly.dev` | new record — `app.remotedays.app` did not resolve to anything before |
| CNAME | `api` | `3plw35g.remotedays.fly.dev` | **replace** the existing record to `56.228.9.58`, which is the retired EC2 instance and currently times out |
| TXT | `_fly-ownership.app` | `app-3plw35g` | proves domain ownership while Cloudflare's proxy is on |
| TXT | `_fly-ownership.api` | `app-3plw35g` | same value for both hostnames |

A and AAAA records work too (`66.241.124.162` and `2a09:8280:1::1b6:37ef:0`), but
the CNAME is what Fly recommends so the addresses can change without a DNS edit.

Three things that will otherwise cost you an hour:

- **Set Cloudflare SSL/TLS to Full (strict).** `Flexible` makes the proxy speak
  HTTP to an origin that redirects to HTTPS, which is an infinite redirect loop.
- **Add the `_fly-ownership` TXT records.** Because Cloudflare proxies the
  traffic, Fly cannot always complete an HTTP-01 challenge; the TXT record is the
  documented path for a proxied domain.
- **If certificate issuance still stalls**, set that one CNAME to **DNS only**
  (grey cloud), let it validate, then re-enable the proxy. Check progress with
  `flyctl certs check app.remotedays.app`. Reference:
  [Custom domains](https://fly.io/docs/networking/custom-domain/).

Only after the certificate shows as issued should you expect `https://` on those
hostnames to work; `http://` will be answered by Fly's redirect as soon as the
DNS is live.

## Deploying

Automatic: push to `main` touching `apps/api/**`, `apps/web/**`, `packages/**`,
`fly.toml` or the workflow itself. A manual run is available from the Actions tab
(`Force deploy the API + SPA to Fly`).

The job stages the runtime secrets, deploys, then smoke tests the result:

1. `flyctl secrets import --stage` — writes the secrets without restarting
   anything, so the deploy applies them in a single rollout.
2. `flyctl deploy --remote-only` — builds on Fly's builder, so no Docker is
   needed on the runner.
3. Smoke test — `GET /` must return 200 and look like the SPA shell, and
   `GET /health` must report `db:ok`. A 200 that is not the SPA, or an API that
   cannot reach Neon, fails the job and tails the machine's logs.

Before the workflow can run at all, the `ci` job has to pass, and that job's
`Type check API` step **currently fails on `main`** for reasons unrelated to this
deployment — see *Known blockers* below.

## Operating it

```bash
# Status, logs, and a shell
flyctl status  -a remotedays
flyctl logs    -a remotedays
flyctl ssh console -a remotedays

# Release the machine's resources while keeping the app, DNS and certs
flyctl scale count 0 -a remotedays      # back to serving: flyctl scale count 1

# Change size (also edit fly.toml so a redeploy does not revert it)
flyctl scale vm shared-cpu-1x --memory 256 -a remotedays

# Secrets
flyctl secrets list -a remotedays
flyctl secrets set SMTP_PASS='...' -a remotedays
```

### Migrations are not run by the deploy

`flyctl deploy` does not touch the schema. Fly's `[deploy] release_command` would
be the natural place, but the migration script is not part of the image: `tsup`
bundles only `server.ts`, and the runtime prunes the dev dependencies that
`ts-node` would need.

So apply migrations from a machine that has the production connection string:

```bash
cd apps/api
DATABASE_URL='postgresql://...' npm run db:migrate          # status / rollback also available
```

`flyctl ssh console -a remotedays -C 'printenv DATABASE_URL'` will print the
connection string if you need to fetch it — treat that output as a credential.

## Operational notes

- **`JWT_SECRET` must stay stable.** Rotating it signs every user out at once.
- **Liveness is `GET /`, not `GET /health`.** `/health` runs `SELECT 1` and is
  documented to *hang* on the connection timeout rather than fail fast when the
  database is unreachable. Pointing the platform check at it would turn a
  database blip into a failing check and a restart loop. Use `/health` for
  monitoring, `/` for liveness.
- **Rate limiting is per process.** `@fastify/rate-limit` keeps its counters in
  memory. One machine means one set of counters, which is the intended behaviour
  here; it would drift if you ever ran more than one.
- **The nightly demo reset stays off.** `DEMO_SEED_ENABLED=false` is pinned in
  `fly.toml` because `node-cron` runs inside the web process and this app shares
  the Neon database with everything else.
- **The SPA is built with no `VITE_API_URL`**, so the client uses the relative
  `/v1` base. That is what makes the same build work on any hostname.
- **The service worker no longer caches the API.** `apps/web/vite.config.ts`
  still has a `runtimeCaching` rule for `https://api.remotedays.app/*`, which no
  longer matches anything now that requests are same-origin. That is the safe
  direction to fail — it means an authenticated response is never written to a
  shared cache — but the rule is now dead weight and could be removed.
- **`fly.toml` is authoritative.** `flyctl deploy` applies it, so editing a
  machine by hand without editing the file will be reverted on the next deploy.

## The API type check

The `ci` job type checks both apps and both are clean:

```bash
npx tsc --project apps/api/tsconfig.json --noEmit   # 0 errors
npx tsc --project apps/web/tsconfig.json --noEmit   # 0 errors
```

This mattered more than it looks. `deploy-app` is gated on
`needs.ci.result == 'success'`, and `main` was carrying **15 type errors** that
reproduced on a pristine `HEAD` checkout — so the `ci` job failed and the deploy
job was skipped every time. The last completed CI run on `main` was 2026-01-07
and the 2026-03-10 merge of the `pivot` branch was cancelled: that is why the
previous EC2/Vercel pipeline had been unable to deploy since March, quite
independently of anything to do with Fly.

They came from a half-finished refactor in which the entry-override path moved
from `HRRepository.updateEntry` to `EntryRepository.updateById` +
`EntryService.overrideEntryById`. Production code followed the move; the specs
were left calling the old API. What was fixed:

| File | Change |
|---|---|
| `repositories/hr.repository.ts` | Imported the `work_status` type it referenced |
| `app.ts` | Exported `AppInstance` — `FastifyInstance` alone means the *default* schema provider, not the TypeBox one `build` actually returns |
| `entries/entries.routes.ts` | Same `as any` handler cast every other route file here already uses |
| `services/request.service.ts` | Dropped a stale 6th argument to `overrideEntry` |
| `services/__tests__/entry.service.spec.ts` | Mock shape, constructor arity, `allowOverwrite` boolean, stale `upsert` assertion |
| `repositories/__tests__/hr.repository.spec.ts` | Repointed to `EntryRepository.updateById` |
| `services/__tests__/hr.service.spec.ts` | Dropped the test for the removed `updateEntry` |
| `scripts/manual-trigger-debug.ts` | **Deleted** — it imported `../worker/worker`, which commit `d6ff443` removed |

Measured against a pristine `HEAD` checkout, the test suite went from 17 failing
tests to 13, with **0 regressions** and no new tests.

**13 tests still fail, all pre-existing** and outside deployment concerns:
`hr-onboarding`, `import-users`, `tamper-proof`, `integration/auth.routes` and
`integration/cta.routes`. They fail identically on `HEAD` — they follow route
paths that the same refactor moved. Worth fixing, but they are not part of a
working pipeline: the `ci` job runs type checks and lint, not `npm test`.

## Verification status

Verified locally:

- `flyctl config validate` passes on `fly.toml`.
- `flyctl` created the app, both certificates and the shared IPv4/IPv6.
- The image builds and boots against a real PostgreSQL; `/` serves the SPA shell,
  a deep link returns the same shell, an unknown `/v1` path still answers with a
  JSON 404, `/health` reports `db:ok`, and cache headers are right per file.
- `apps/web/.env` no longer reaches the build stage, and the SPA bundle contains
  no absolute API URL.
- API and web type checks are clean, and the test suite has no regressions.

Not yet verified, because it needs the GitHub secret and the DNS records above:

- A real CI deploy.
- Certificate issuance for `app.remotedays.app` and `api.remotedays.app`.
- Traffic served over the custom domains.
- Anything amd64-specific: the image was built natively here, and Fly's remote
  builder compiles for amd64 itself.
