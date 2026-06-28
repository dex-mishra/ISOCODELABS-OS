# Isocodelabs Ops Hub — Developer Handoff

## 1. Project Overview

Internal operations management platform for Isocodelabs, a 2-founder web development company. Manages tasks, meetings, clients, ventures, content, finances, and team communication in one unified interface.

- **Live URL**: https://os.isocodelabs.com
- **GitHub**: https://github.com/dex-mishra/ISOCODELABS-OS
- **GCP Project**: automaters (us-central1)

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL via Prisma ORM |
| Auth | Custom JWT (bcryptjs + jsonwebtoken) |
| AI | Google Vertex AI (Gemini models) |
| Real-time | Socket.io |
| Styling | Tailwind CSS |
| Animations | Framer Motion |
| Charts | Recharts |
| Icons | lucide-react |
| File Uploads | Local filesystem (public/uploads/) |
| Deployment | GCP Cloud Run + Cloud SQL |
| CI/CD | Cloud Build (auto-deploy on push to main) |
| DNS | Cloudflare (CNAME to ghs.googlehosted.com) |

## 3. Architecture

```
src/
├── app/
│   ├── (auth)/          # Login page (public)
│   ├── (dashboard)/     # All authenticated pages
│   │   ├── dashboard/   # Main dashboard
│   │   ├── meetings/    # Meetings + Google Meet
│   │   ├── tasks/       # Kanban + list view
│   │   ├── chat/        # Team chat (full page)
│   │   ├── clients/     # CRM + pipeline
│   │   ├── projects/    # Project management
│   │   ├── ventures/    # Child products & sister companies
│   │   ├── content/     # Content management
│   │   ├── ideas/       # Idea capture + validation
│   │   ├── workspace/   # Notion-like docs
│   │   ├── money/       # Transactions + invoices
│   │   ├── employees/   # Employee management
│   │   ├── legal/       # Legal documents
│   │   ├── business-model/ # AI business canvas
│   │   ├── explore/     # AI research
│   │   ├── test-site/   # Image/video generation
│   │   └── settings/    # Profile, integrations
│   └── api/             # All REST API routes
├── components/
│   ├── ui/              # Base components (Card, Badge, Button, Input, etc.)
│   ├── modules/         # Feature modules (GlobalChatPanel, FloatingTeamChat, QuickIdeaCapture)
│   ├── team-chat/       # Team chat components
│   └── layout/          # DashboardLayout
├── contexts/            # AuthContext, RealtimeContext
├── hooks/               # useTeamChat
└── lib/
    ├── ai/              # Vertex AI integration (chat, models, explore, money, content, idea-validation)
    ├── auth/            # JWT middleware, token utils
    ├── db/              # Prisma client singleton
    ├── integrations/    # Google Meet, WhatsApp, Nanobana (Imagen), Veo
    ├── realtime/        # Socket.io server setup
    ├── money/           # Auto-income logic
    └── mcp-engine.ts    # MCP server for external API access
```

## 4. Local Development Setup

Prerequisites: Node.js 20+, PostgreSQL running on localhost:5432

```bash
git clone https://github.com/dex-mishra/ISOCODELABS-OS.git
cd ISOCODELABS-OS
npm install
```

Create `.env` (copy from .env.example):
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/isocodelabs_ops_hub
JWT_SECRET=your-secret-key-here
GCP_PROJECT_ID=automaters
GCP_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=./gcp-service-account.json
GOOGLE_CLIENT_ID=<your-google-client-id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
WHATSAPP_PHONE_NUMBER_ID=1151013841431637
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
```

```bash
npx prisma db push
npx prisma db seed
npm run dev
```

Login at http://localhost:3000:
- devansh@isocodelabs.com / Av6*10^23
- aryan@isocodelabs.com / Isocode@2026

## 5. Environment Variables

| Variable | Description | Local Value | Production Value |
|----------|-------------|-------------|-----------------|
| DATABASE_URL | PostgreSQL connection | localhost:5432 | Cloud SQL socket path |
| JWT_SECRET | JWT signing key | any string | super-secret-key-for-isocodelabs-ops-hub-2026 |
| GCP_PROJECT_ID | GCP project | automaters | automaters |
| GCP_LOCATION | GCP region | us-central1 | us-central1 |
| GOOGLE_APPLICATION_CREDENTIALS | SA key file path | ./gcp-service-account.json | (uses compute SA via IAM) |
| GOOGLE_CLIENT_ID | OAuth client | (see .env) | same |
| GOOGLE_CLIENT_SECRET | OAuth secret | (see .env) | same |
| GOOGLE_REDIRECT_URI | OAuth callback | localhost:3000/api/auth/google/callback | os.isocodelabs.com/api/auth/google/callback |
| WHATSAPP_PHONE_NUMBER_ID | Meta WhatsApp | 1151013841431637 | same |
| NEXT_PUBLIC_SOCKET_URL | Socket.io URL | http://localhost:3000 | https://os.isocodelabs.com |

## 6. Database Models (Key Tables)

**Core**: User, Task, SubTask, Meeting, MeetingAttendee
**CRM**: Client, Project, Milestone, Interaction, CommunicationLog, ClientInsight
**Ventures**: Venture, VentureAsset, FundingRound
**Chat**: TeamChannel, ChannelMember, TeamMessage, ChatMessage
**Content**: ContentItem, ContentIdea, ContentOutline, ContentIdeaValidation
**Ideas**: Idea, AiValidation
**Finance**: Transaction, Invoice, Employee, EmployeePayment
**Other**: BusinessModel, LegalDocument, Notification, Setting, WorkspacePage, WorkspaceFolder, ExploreResource, ExploreBookmark, TestResult, DashboardAccount, Industry, IndustryProduct, McpApiKey

Relations: Tasks/Meetings/Projects/Clients/Transactions can optionally link to a Venture via `venture_id`.

## 7. Features

1. **Dashboard** — Overview cards, revenue chart (real transaction data), activity feed, quick actions
2. **Meetings** — Schedule, Google Meet integration (real links via OAuth), notes, extract tasks, Fathom AI summaries, delete
3. **Tasks** — Kanban board (fixed 280px columns, vertical scroll), list view, subtasks, assign, priority, venture linking, done-task archiving (5 visible, expand for more)
4. **Team Chat** — Channels, real-time messaging (Socket.io locally, 5s polling on production), image sharing, floating panel (Ctrl+Shift+C), full page at /chat
5. **Clients/CRM** — Pipeline (Lead→Active→Won), interactions, Gmail/WhatsApp sync, AI insights
6. **Projects** — Milestones, timeline, budget tracking, auto-income on completion
7. **Ventures** — Products (child) & sister companies, funding rounds dashboard, assets (GitHub/GDrive/Figma etc), linked tasks/meetings/clients/projects/business-plans
8. **Content** — Blog posts, multi-platform scheduling, AI content generation
9. **Ideas** — Quick capture (Ctrl+Shift+I), AI validation, fact-checking, status tracking
10. **Workspace** — Notion-like pages with Tiptap rich text editor, folders, search
11. **Money** — Transactions (income/expense), invoices, AI financial analysis, venture filter
12. **Employees** — Profiles, skills, payments, contracts
13. **Legal** — Document upload, versioning, tags, client/project linking
14. **Business Model** — AI-generated business canvas, versioning, venture linking
15. **Explore** — AI-powered research, bookmarks, study plans, Q&A
16. **Test Site** — Image generation (Imagen 4), video generation (Veo 3)
17. **Settings** — Profile (avatar upload), integrations (Google, WhatsApp), API keys, theme
18. **Global AI Chat** — Ctrl+J, 11 Gemini model options, streaming responses
19. **Notifications** — Real-time, mark read, unread count
20. **MCP Server** — External API access with API key authentication

## 8. AI Integration

All AI uses Vertex AI via GCP service account. Available models (selectable in chat):

| Model | Tier | Use Case |
|-------|------|----------|
| Gemini 3.5 Flash (default) | Fast | Everyday tasks |
| Gemini 3.1 Flash Lite | Fast | Ultra-low latency |
| Gemini 3 Flash Preview | Fast | Near-Pro with Flash speed |
| Gemini 2.5 Flash | Fast | Stable general tasks |
| Gemini 2.5 Flash-Lite | Fast | Cheapest option |
| Gemini 3.1 Pro Preview | Premium | 1M token context |
| Gemini 3 Pro Preview | Advanced | Top-tier agentic |
| Gemini 2.5 Pro | Advanced | Complex logic/coding |
| Gemini 3.1 Flash Image | Standard | Image gen + Flash speed |
| Gemini 3 Pro Image | Advanced | Creative workflows |
| Gemini 2.5 Flash Image | Standard | Multi-turn image editing |

Auth: Locally via `gcp-service-account.json`. On Cloud Run via compute service account's `Vertex AI User` IAM role (uses metadata server).

## 9. Real-Time (Socket.io)

- Server: `src/lib/realtime/socket-server.ts` (initialized via `pages/api/socket.ts`)
- Works fully in local dev (WebSocket)
- On Cloud Run: Socket.io doesn't work (standalone output). Team chat uses 5-second polling fallback.
- Events: `team-chat:join`, `team-chat:leave`, `team-chat:message`, `team-chat:typing`, workspace presence

## 10. Deployment

**Infrastructure:**
- Cloud Run: isocodelabs-ops-hub (us-central1, min:1 max:3, 1Gi memory)
- Cloud SQL: isocodelabs-db (PostgreSQL 15, db-f1-micro)
- Connection name: automaters:us-central1:isocodelabs-db
- Image: gcr.io/automaters/isocodelabs-ops-hub

**CI/CD:** Push to `main` → Cloud Build trigger → Docker build → Deploy to Cloud Run (automatic)

**Manual deploy:**
```bash
# Build
gcloud builds submit --tag gcr.io/automaters/isocodelabs-ops-hub --timeout=1200s
# Deploy
gcloud run deploy isocodelabs-ops-hub --image gcr.io/automaters/isocodelabs-ops-hub --region us-central1
```

**DB sync (after schema changes):**
```bash
# Download proxy
curl -L -o cloud-sql-proxy.exe "https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.14.3/cloud-sql-proxy.x64.exe"
# Start proxy
.\cloud-sql-proxy.exe automaters:us-central1:isocodelabs-db --port 5433
# In another terminal
$env:DATABASE_URL = "postgresql://postgres:IsoCode%23Ops2026Db@localhost:5433/isocodelabs_ops_hub"
npx prisma db push --accept-data-loss
npx prisma db seed
```

**Update env vars:**
```bash
gcloud run services update isocodelabs-ops-hub --region us-central1 --update-env-vars "KEY=VALUE"
```

## 11. Key Conventions

- All currency: ₹ (INR), `en-IN` locale
- Port: 3000 locally, 8080 on Cloud Run (PORT env)
- Auth: `requireAuth(req)` middleware returns `{ id, email, name }` or null
- File uploads: `public/uploads/{type}/` with UUID filenames
- Never mock data — throw clear errors
- Keyboard shortcuts: Ctrl+J (AI Chat), Ctrl+Shift+C (Team Chat), Ctrl+Shift+I (Quick Idea)
- Floating buttons stacked vertically: bottom-6 (AI), bottom-[72px] (Team Chat), bottom-[124px] (Ideas)

## 12. Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| 500 on login | DB connection | Check DATABASE_URL=localhost, PostgreSQL running, migrations applied |
| "Cannot find module" | Corrupted .next | Delete .next/, restart |
| Google Meet "Invalid video call name" | OAuth not connected | Complete OAuth flow at /settings |
| AI same canned reply | Falling back to mock | Verify service account auth |
| Vertex AI 404 | Model not enabled | Enable in GCP Model Garden |
| Vertex AI 429 | Rate limit | Uses flash model + retry with exponential backoff |
| WhatsApp "missing permissions" | System User not assigned | Use Phone Number ID in API URL |
| "0.0.0.0:8080" redirect | req.url resolves to internal | Fixed: uses x-forwarded-host header |
| Team chat "Disconnected" | Socket.io unavailable on Cloud Run | Normal: uses 5s polling fallback, indicator hidden |

## 13. Monthly Cost Breakdown

| Service | Cost |
|---------|------|
| Cloud Run (min-instances=1) | ~₹4,300 (~$52) |
| Cloud SQL (db-f1-micro) | ~₹775 (~$9.37) |
| Vertex AI (Gemini Flash) | ~₹80-250 (~$1-3) |
| Storage/Network | ~₹40 (~$0.50) |
| **Total** | **~₹5,200 (~$63/month)** |

---

*Last updated: June 2026*
*Maintained by: Devansh Mishra (devansh@isocodelabs.com)*
