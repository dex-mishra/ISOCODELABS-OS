# ─────────────────────────────────────────────
# Isocodelabs Ops Hub — Cloud Run Dockerfile
# ─────────────────────────────────────────────

# Stage 1: Build
FROM node:20-slim AS builder

# Install OpenSSL (required by Prisma)
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY prisma ./prisma
RUN npm install --no-audit --no-fund

# Copy source and build
COPY . .

# Dummy build-time env vars so module-level code doesn't throw during
# Next.js static analysis. Real values are injected by Cloud Run at runtime.
ENV JWT_SECRET="build-time-placeholder-secret-key-32chars"
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public"
ENV GCP_PROJECT_ID="build-placeholder"
ENV GCP_LOCATION="us-central1"
ENV NEXT_TELEMETRY_DISABLED=1

RUN npx prisma generate
RUN npm run build

# Stage 2: Runtime
FROM node:20-slim AS runner

RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

ENV NODE_ENV=production

# Copy the standalone server output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Cloud Run injects PORT (defaults to 8080)
ENV PORT=8080
EXPOSE 8080

CMD ["node", "server.js"]
