# Isocodelabs Ops Hub — Agent Guide

## Project Overview
Internal operations management web app for the 2-founder Isocodelabs team. Next.js 14 (App Router), PostgreSQL via Prisma, JWT auth, Vertex AI (Gemini), Socket.io real-time.

## Environment
- **OS**: Windows. PostgreSQL runs natively on Windows at `localhost:5432`.
- **DB**: `isocodelabs_ops_hub`, user/pass `postgres/postgres`.
- **Dev server**: `npm run dev` runs `start-dev.js` which kills stale processes on port 3000 and starts Next.js on **port 3000** (fixed).
- **Login**: `dex.mishra@gmail.com` / `admin123`

## Critical Rules
1. `DATABASE_URL` MUST use `localhost` (not WSL IP, not `[::1]`).
2. Port is ALWAYS 3000. OAuth redirect URIs depend on this — never change it.
3. After code changes that misbehave, delete `.next` and restart.
4. AI uses Vertex AI via service account (`GOOGLE_APPLICATION_CREDENTIALS=./gcp-service-account.json`).
5. Default AI model: `gemini-2.5-flash` (fast). Pro only when explicitly selected.
6. `gcp-service-account.json` and `.env` are gitignored — never commit.
7. Never silently fall back to mock data — throw clear errors.

## Key Integrations
- **Vertex AI / Gemini**: chat, idea validation, content AI, insights. Service account auth. Model: gemini-2.5-flash.
- **Imagen / Veo**: Test Site image/video gen via Vertex AI (`{location}-aiplatform.googleapis.com/.../models/{model}:predict`). Models: `imagen-3.0-generate-002`, `veo-3.0-generate-001`.
- **Google Meet/Calendar + Gmail**: OAuth 2.0. Scopes: `calendar.events` + `gmail.readonly`. Tokens stored encrypted in Settings table.
- **WhatsApp**: Meta Cloud API. Permanent System User token. Phone Number ID `1151013841431637`.
- **Fathom**: meeting recordings (link-based or Puppeteer scrape).

## Common Failure Modes & Fixes
- **500 on login / no data**: DB connection. Check `DATABASE_URL=localhost`, PostgreSQL running, migrations applied (`npx prisma migrate status`), seed (`npx prisma db seed`).
- **"Cannot find module './XXXX.js'"**: corrupted `.next` cache. Delete `.next`, restart.
- **Google Meet "Invalid video call name"**: mock link — OAuth not completed. Complete flow at `/api/auth/google?token=JWT`.
- **AI returns same canned reply**: falling back to mock. Verify service account auth works.
- **Vertex AI 404 "model not found"**: model not enabled in GCP Model Garden, or wrong region (use us-central1), or wrong model name.
- **Vertex AI 429 RESOURCE_EXHAUSTED**: quota. Use flash model + retry with backoff.
- **WhatsApp "missing permissions"**: System User not assigned the WhatsApp Business Account asset. Use Phone Number ID (not Business Account ID) in API URL.

## Deployment Target
GCP Cloud Run + Cloud SQL (PostgreSQL) + service account for Vertex AI. Project: `automaters`, region `us-central1`.

## Active Work Log
- Building: Global AI chat (Ctrl+J), auto-income on project/client completion, employee removal.
- Then: Dockerize + deploy to Cloud Run.
