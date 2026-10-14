# syntax=docker/dockerfile:1
#
# Production image for Remote Days.
#
# This one image serves both halves of the app: the Fastify API under /v1 and the
# built React SPA at every other path. Deploying them together is what keeps the
# session cookie first-party and removes CORS from the picture entirely.
#
# The API is an npm workspace that resolves @remotedays/types from packages/, so
# the build context must be the REPOSITORY ROOT:
#
#   docker build -f apps/api/Dockerfile -t remotedays:local .
#
# Build-time notes:
#   * bcrypt is a native addon. bookworm-slim (glibc) normally resolves a
#     prebuilt binary; python3/make/g++ are installed as a fallback so the build
#     cannot fail on a platform without a matching prebuild.
#   * Only the api and web workspaces are installed, which keeps the dependency
#     tree limited to what the server and the SPA actually need.
#   * Playwright is a devDependency of the web workspace and is not used at build
#     time, so its browser download is skipped rather than adding hundreds of
#     megabytes to the builder.
#   * tsup externalises package.json dependencies, so the runtime stage needs the
#     production node_modules as well as dist/.

# --------------------------------------------------------------------- build
FROM node:22-bookworm-slim AS build
WORKDIR /repo

ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    PLAYWRIGHT_SKIP_BROWSER_GC=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# Manifests first so the dependency layer is cached until a manifest changes.
# npm workspaces require every workspace manifest to be present for `ci`.
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/types/package.json ./packages/types/
COPY packages/shared/package.json ./packages/shared/

RUN npm ci --workspace=@remotedays/api --workspace=@remotedays/web --include-workspace-root

COPY packages ./packages
COPY apps/api ./apps/api
COPY apps/web ./apps/web

RUN npm run build --workspace=@remotedays/api

# The SPA is built with an explicitly empty VITE_API_URL: the client then falls
# back to the relative /v1 base, which is what makes same-origin work on any
# hostname. Set here rather than left to the absence of a .env file, so a stray
# apps/web/.env cannot silently turn production into a cross-origin call.
RUN VITE_API_URL= npm run build --workspace=@remotedays/web

# ------------------------------------------------------- production modules
# Note this runs *after* the web build — pruning drops the web workspace's
# devDependencies (vite, typescript), which are only needed above.
FROM build AS prod-deps
RUN npm prune --omit=dev --workspace=@remotedays/api --include-workspace-root

# ------------------------------------------------------------------- runtime
FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

WORKDIR /repo

COPY --from=prod-deps /repo/node_modules ./node_modules
COPY --from=prod-deps /repo/package.json ./package.json
COPY --from=prod-deps /repo/apps/api/package.json ./apps/api/package.json
COPY --from=prod-deps /repo/apps/api/dist ./apps/api/dist
COPY --from=prod-deps /repo/apps/web/dist ./apps/web/dist

# Drop privileges: the node image ships an unprivileged `node` user.
USER node

EXPOSE 3000

# The container itself only declares the port; probes are configured on the
# hosting platform. Point the platform's liveness check at `/` — it serves the
# SPA shell without touching the database — and use `/health` for readiness,
# since that one runs SELECT 1.
CMD ["node", "apps/api/dist/server.js"]
