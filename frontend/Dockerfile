# =============================================================================
# CareerAgent Frontend — Production Dockerfile
# =============================================================================
# Strategy: three-stage build
#   • deps     — installs all node_modules (prod + dev) for the build step
#   • builder  — runs `next build`; produces .next/standalone + .next/static
#   • runtime  — copies only the standalone server; no source / node_modules
#
# ⚠️  NEXT_PUBLIC_* env vars are embedded into the JS bundle at build time.
#     Pass them as --build-arg (local) or as Build Variables in Railway.
#
# Runtime: Node 20 LTS on Debian Bookworm slim
# User: non-root `nextjs` (UID 1001) — security best practice
# Port: 3000 (Next.js standalone server)
# =============================================================================

# ── Stage 1: install dependencies ─────────────────────────────────────────────
FROM node:20-slim AS deps

WORKDIR /app

# Copy manifests only → layer cache reused when source changes but deps don't
COPY package.json package-lock.json ./

# ci install: respects lock file exactly, no package-lock mutations
RUN npm ci --ignore-scripts

# ── Stage 2: build the Next.js app ────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

# Receive NEXT_PUBLIC_* values at build time (required to bake them into the bundle)
# Railway: add these as "Build Variables" in the service settings.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_API_URL

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    # Disable Next.js telemetry during build
    NEXT_TELEMETRY_DISABLED=1

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy all source files
COPY . .

RUN npm run build

# ── Stage 3: minimal runtime ──────────────────────────────────────────────────
FROM node:20-slim AS runtime

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

# Create a non-root user for security
RUN groupadd --gid 1001 nodejs && \
    useradd  --uid 1001 --gid nodejs --shell /bin/bash --no-create-home nextjs

WORKDIR /app

# Copy the standalone server produced by `output: "standalone"`
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Copy static assets (CSS, JS chunks, images) — served by the standalone server
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy the public folder (favicon, SVGs, etc.)
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

ENV PORT=3000 \
    HOSTNAME="0.0.0.0"

# Health check — lightweight Node HTTP request to the root path
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD node -e "require('http').get('http://localhost:'+process.env.PORT+'/', (r) => { process.exit(r.statusCode >= 400 ? 1 : 0) }).on('error', () => process.exit(1))"

# The standalone server is the entrypoint (no next CLI needed)
CMD ["node", "server.js"]
