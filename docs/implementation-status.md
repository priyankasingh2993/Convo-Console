## Convo — Implementation Status (March 2026)

This document describes **everything implemented so far** in the Convo project, from **design and reference** through **development and ops**. The source of truth for scope is **`docs/screen-map-v2.md`** (Cursor Master Prompt v2.0).

---

### Implemented at a glance

| Area | What’s done |
|------|-------------|
| **Design** | Design tokens (globals.css), Sora + DM Sans, animations; reference prototype (console.html). |
| **Static prototype** | index.html / console.html; deployed to Cloudflare Pages (convo-console). |
| **Next.js app** | Next 15 + TS in `web/`; App Router, ClerkProvider, sign-in/sign-up pages; middleware (protect, onboarding redirect). |
| **Onboarding** | Q1–Q4 + step 4.5 (owner phone), loading (4 steps), first-win coach; POST to API with Clerk token → redirect to /inbox. |
| **Onboarding API** | Clerk JWT verify, create org if needed, D1 insert, Clerk org metadata PATCH. |
| **App shell** | (app) layout, Sidebar (220px), nav (Inbox, Broadcast, Contacts, Playbooks, FAS, Settings), TrialBadge, user row; disabled items (Flow Builder, Campaign Analytics, Pipeline) with tooltips. |
| **Placeholder pages** | inbox, broadcast, contacts, playbooks, analytics/fas, settings → whatsapp, settings/whatsapp, settings/billing. |
| **Workers API** | Health; GET/POST webhook (Meta verify + message/status handling); GET /api/ws (WebSocket proxy); POST onboarding/complete. |
| **Durable Object** | InboxConnection: /connect (WS), /broadcast, heartbeat (ping/pong), dedupe (100 ids), session cleanup. |
| **Data** | D1 schema (15 tables), migrations, local seed script for webhook test. |
| **Ops** | wrangler.toml (D1, KV, R2, DO, crons); YOUR-CHECKLIST.md; .env.example; npm run dev:web, dev:api, seed:local; README. |

---

## 1. Design & reference

### 1.1 Design tokens and typography

- **File:** `web/src/app/globals.css`
- **Tokens:** Full palette from spec: `--blue`, `--blue-light`, `--blue-dim`, `--midnight`, `--surface`, `--surface2`, `--surface3`, `--border`, `--border2`, `--text`, `--text2`, `--text3`, `--green`, `--green-dim`, `--red`, `--amber`, `--purple`.
- **Typography:** Display/headings — **Sora** (600–700). Body/labels — **DM Sans** (400–500). Both loaded via Google Fonts in layout.
- **Animations:** `slideIn`, `blobFloat`, `spin` for onboarding and loading.
- **Radii:** Cards/modals 12px; buttons/inputs 8px; avatars/badges 99px.

### 1.2 Reference prototype

- **Files:** `index.html`, `docs/console.html`
- **Content:** Single-page static UI for onboarding (Q1–Q4), inbox, broadcast, contacts, flows, FAS, pipeline, CTWA ads, settings. Used as visual reference for sidebar and layout.
- **Deployment:** Cloudflare Pages project **convo-console** via `wrangler pages deploy . --project-name=convo-console`. Live at `https://convo-console.pages.dev`.

---

## 2. Next.js application (`web/`)

### 2.1 Config and tooling

- **`web/package.json`** — Next 15, React 19, TypeScript; `@clerk/nextjs`, `@opennextjs/cloudflare`, `hono`, `jose`; scripts: `dev`, `build`, `start`, `lint`. Install may require `--legacy-peer-deps` for Clerk.
- **`web/tsconfig.json`** — App Router, `moduleResolution: "bundler"`, `@/*` → `./src/*`.
- **`web/next.config.ts`** — `reactStrictMode: true`, OpenNext/Cloudflare-related config as needed.
- **`web/.env.example`** — Documents `NEXT_PUBLIC_CLERK_*`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_API_URL`. Copy to `.env.local` and fill from Clerk Dashboard.
- **`web/.gitignore`** — `.next`, `.env*.local`, `node_modules`, etc.

### 2.2 Root layout and entry

- **`web/src/app/layout.tsx`** — Wraps app in `ClerkProvider`; loads Sora + DM Sans; dark background (`--midnight`), global styles.
- **`web/src/app/page.tsx`** — Redirects `/` → `/sign-up`.

### 2.3 Auth (Clerk)

- **Sign-in:** `web/src/app/(auth)/sign-in/[[...sign-in]]/page.tsx` — Full-screen dark container, card with `<SignIn />`.
- **Sign-up:** `web/src/app/(auth)/sign-up/[[...sign-up]]/page.tsx` — Same pattern with `<SignUp />`.
- **Middleware:** `web/src/middleware.ts`
  - Public routes: `/sign-in`, `/sign-up`, `/api/webhook/*`.
  - `auth.protect()` for all other routes.
  - If no `sessionClaims.org_metadata.onboardedAt` → redirect to `/onboarding`.
  - If `onboardedAt` present and path is `/onboarding` → redirect to `/inbox`.
- **Session:** Clerk session token must include `org_metadata` (Customize session token in Dashboard: `{ "org_metadata": "{{org.public_metadata}}" }`).

### 2.4 Onboarding flow (Screens 1–6)

- **Files:** `web/src/app/onboarding/page.tsx`, `web/src/app/onboarding/OnboardingClient.tsx`
- **Q1 — Industry:** 8 options (Real Estate, D2C, Education, Healthcare, F&B, Financial, Travel, Other). Icon + title + subtitle; 2-column grid; selection state with design tokens.
- **Q2 — Goal:** 5 options (Sales, Marketing, Support, Commerce, All). Single-column cards; defines workspace mode.
- **Q3 — Team size:** Just me, 2–5, 6–20, 20+.
- **Q4 — Current tool:** Two-step: “Starting fresh” vs “Switching” + tool picker (Wati, Interakt, AiSensy, Gallabox, Other). Next enabled only when step is valid.
- **Step 4.5 — Owner phone:** “One last thing” — +91 and 10-digit field; “Skip for now” link; stored as `ownerPhone` in state.
- **Progress:** 4-dot progress bar, step counter, Back/Continue buttons.
- **Loading (Screen 5):** 4-step sequence (playbook, templates, config/migration, “Workspace ready!”) with spinner and staggered text.
- **First-win coach (Screen 6):** Goal-specific copy (e.g. Sales: “Qualify 47 waiting leads in 5 min” + 3 steps). “Go to my dashboard →” calls `POST ${NEXT_PUBLIC_API_URL}/api/onboarding/complete` with `getToken()` in `Authorization: Bearer`, body: industry, goal, teamSize, tool, switcherTool, ownerPhone; then `router.push('/inbox')`.

### 2.5 App shell (layout and sidebar)

- **Layout:** `web/src/app/(app)/layout.tsx` — Flex row, full height; left `<Sidebar />` 220px; right `<main>` flex 1, min-width 0, overflow hidden.
- **Sidebar:** `web/src/components/shared/Sidebar.tsx`
  - Logo row: 30×30 blue logomark, “Convo” (Sora 700).
  - Workspace switcher: org avatar (gradient), name, chevron.
  - Nav sections: CORE (Inbox, Broadcast, Contacts), TOOLS (Playbooks, Flow Builder disabled), ANALYTICS (FAS, Campaign Analytics disabled), PIPELINE (Lead Pipeline disabled), SETTINGS. Active state: `--blue-dim` bg, `--blue-light` label. Disabled items: tooltip “Coming in Month 2” / “Month 3”, no navigate.
  - Bottom: `TrialBadge` (from org_metadata.trialStartDate → “Day X of 14 — Trial”, colour/urgency by day; link to /settings/billing); user row (avatar, name, role, green dot).
- **TrialBadge:** `web/src/components/shared/TrialBadge.tsx` — Reads trialStartDate from auth; shows day count; Upgrade → /settings/billing.

### 2.6 Placeholder pages and shared UI

- **EmptyState:** `web/src/components/ui/EmptyState.tsx` — Props: icon, title, description, optional cta `{ label, href? }`. Centred; used across placeholders.
- **Routes and copy:**
  - `(app)/inbox/page.tsx` — “No conversations yet”; CTA “Connect WhatsApp →” → `/settings/whatsapp`.
  - `(app)/broadcast/page.tsx` — “No campaigns yet”; CTA “New Campaign →”.
  - `(app)/contacts/page.tsx` — “No contacts yet”; CTA “Import CSV →”.
  - `(app)/playbooks/page.tsx` — “Playbooks” placeholder.
  - `(app)/analytics/fas/page.tsx` — “FAS Score” placeholder.
  - `(app)/settings/page.tsx` — Redirects to `/settings/whatsapp`.
  - `(app)/settings/whatsapp/page.tsx` — Status (“No number connected”), “Connect WhatsApp →”, business profile note.
  - `(app)/settings/billing/page.tsx` — Plan cards (Starter, Growth, Scale, Enterprise), current trial note.

---

## 3. Workers API and Durable Object

### 3.1 Wrangler config

- **File:** `wrangler.toml` (repo root)
- **Bindings:** D1 `DB` (convo-production), KV `KV`, R2 `R2`, Durable Object `INBOX` (InboxConnection). Placeholder IDs for D1 and KV; comments explain how to obtain and paste real IDs.
- **Vars:** `ENVIRONMENT = "development"`.
- **Migrations:** D1 migrations; DO migration tag `v1` with `InboxConnection`.
- **Crons:** `0 0 * * *` (daily) for future trial/journey.

### 3.2 Worker entry and routes

- **File:** `workers/api.ts` (Hono app)
- **GET /health** — Returns `{ status: "ok", ts }`.
- **GET /api/webhook/:wabaNumberId** — Meta webhook verification: reads `hub.mode`, `hub.verify_token`, `hub.challenge`; checks token against `waba_numbers.webhook_verify_token`; returns challenge as plain text or 403.
- **POST /api/webhook/:wabaNumberId** — Raw body verified with `X-Hub-Signature-256` (HMAC-SHA256) when `ENVIRONMENT !== "development"` (uses `META_APP_SECRET`). Parses JSON; for each `entry[].changes[].value`:
  - **messages:** Resolves/inserts contact (org_id, phone, name from contacts); gets/creates conversation; updates last_message_at, unread_count, window_expires_at, window_type; inserts message (direction `inbound`, meta_message_id); forwards `{ type: "new_message", payload }` to InboxConnection DO.
  - **statuses:** Updates `messages.status` by meta_message_id; forwards `{ type: "message_status", payload }` to DO.
- **GET /api/ws/:wabaNumberId** — WebSocket proxy: forwards request to DO at `http://do/connect` so clients can connect to one DO per WABA.
- **POST /api/onboarding/complete** — Requires `Authorization: Bearer <Clerk session token>`. Verifies JWT via Clerk JWKS; reads `sub` and optional `org_id`; if no org, creates org via Clerk API; inserts row into D1 `organizations`; PATCHes Clerk org `public_metadata` (onboardedAt, trialStartDate, industry, goal, teamSize, tool, plan). Returns `{ status: "ok", orgId, trialStartDate }`.
- **Env types:** `DB`, `ENVIRONMENT`, `CLERK_SECRET_KEY`, `INBOX`, optional `META_APP_SECRET`. Re-exports `InboxConnection` from `./durable-objects/InboxConnection`.

### 3.3 Meta signature and Clerk helpers

- **verifyMetaSignature(body, signatureHeader, secret)** — HMAC-SHA256 of body, compares to `X-Hub-Signature-256` (sha256=hex).
- **getClerkOrgIdAndSub(token)** — Decodes JWT, fetches JWKS from issuer, verifies; returns `{ orgId | null, sub }`.
- **createClerkOrg(secretKey, createdByUserId)** — POST to Clerk API to create organization.
- **patchClerkOrgMetadata(secretKey, orgId, metadata)** — PATCH org public_metadata.

### 3.4 Durable Object: InboxConnection

- **File:** `workers/durable-objects/InboxConnection.ts`
- **GET /connect** — WebSocket upgrade; accepts connection; adds to `sessions` Set; on `message` “ping” sends “pong”; on close/error removes from Set.
- **POST /broadcast** — Reads JSON body; deduplicates by `payload.message.meta_message_id` or `payload.messageId` (keeps last 100 ids, skips if seen); broadcasts JSON string to all sessions; removes failed sockets from Set.
- **Export:** Class exported from `workers/api.ts` so Wrangler can bind it.

---

## 4. Data (D1 schema and seed)

### 4.1 Schema

- **Files:** `schema.sql` (root), `web/src/lib/db/schema.sql` (copy for reference)
- **Tables (15):** organizations, waba_numbers, agents, contacts, conversations, messages, templates, campaigns, playbook_activations, fas_events, payment_links, contact_notes, conversation_tags, consent_records, audit_log. Indexes for common lookups.
- **Notable columns:** organizations (industry, goal, team_size, tool, switcher_tool, owner_phone, trial_start_date, plan); waba_numbers (webhook_verify_token); contacts UNIQUE(org_id, phone); messages (meta_message_id UNIQUE, direction, type, content).
- **Run (local):** `npx wrangler d1 execute convo-production --local --file=schema.sql`

### 4.2 Local seed (webhook test)

- **File:** `scripts/seed-local-d1.sql` — Inserts test org and test WABA (`test-org`, `test-waba` with webhook_verify_token `my-verify-token`).
- **Script:** From root, `npm run seed:local` runs the seed against local D1 so webhook + WebSocket test works without manual SQL.

---

## 5. Ops and run instructions

### 5.1 Repo root

- **package.json** — Scripts: `dev:web` (cd web && npm run dev), `dev:api` (wrangler dev workers/api.ts --local), `seed:local` (wrangler d1 execute … --file=scripts/seed-local-d1.sql). Dependencies: hono, jose; devDependencies: @cloudflare/workers-types.
- **README.md** — Short intro; points to **docs/YOUR-CHECKLIST.md** for one-time setup; commands for `npm install`, `npm run dev:web`, `npm run dev:api`.

### 5.2 Your checklist

- **File:** `docs/YOUR-CHECKLIST.md`
- **Contents:** Step-by-step list of what only you can do: Cloudflare (login, create D1/KV, paste IDs, run schema, `wrangler secret put CLERK_SECRET_KEY`); Clerk (env vars in .env.local, session token claim `org_metadata`, enable organizations); install and run (npm install, two terminals); optional webhook test (seed:local, wscat, curl); later (META_APP_SECRET, etc.).

### 5.3 How to run (summary)

- **Terminal 1:** `npm run dev:web` → http://localhost:3000 (redirects to /sign-up).
- **Terminal 2:** `npm run dev:api` → http://localhost:8787.
- **Prerequisites:** D1 and KV IDs in wrangler.toml; schema run once; `wrangler secret put CLERK_SECRET_KEY`; Clerk app with session claim and orgs enabled; `web/.env.local` and root `npm install` (and `cd web && npm install`).

**Optional webhook test:** `npm run seed:local` once; with dev:api running, connect `wscat -c ws://localhost:8787/api/ws/test-waba` and send the curl from section 9 below; WS client receives `new_message`; D1 `messages` has new row.

---

## 6. Spec and Day 1 docs

- **`docs/screen-map-v2.md`** — Full Cursor Master Prompt: stack, design tokens, folder structure, Month 1 build order, D1/DO/Hono/Clerk patterns.
- **`docs/DAY1.md`** — Day 1 plan and checklist; Tasks 1–3 (Clerk + onboarding, webhook + DO, app shell) with “done” items marked; seed and curl for webhook test.

---

## 7. Not yet implemented (high level)

Per `docs/screen-map-v2.md`, the following are **not** built yet:

- **Inbox UI (Screens 7–9):** Conversation list, thread view, send message; real-time updates via WebSocket hook to DO.
- **Contacts (Screens 12–13):** Table, CSV import, contact detail page.
- **Broadcast (Screens 10–11):** Campaign list, 4-step campaign builder modal, D1 + Meta stats.
- **Playbooks (Screen 14):** Activation UI and automation wiring.
- **Full settings flows:** Real WhatsApp connection, business profile, billing checkout, team, DPDP, API (placeholders exist for whatsapp + billing).
- **Trial journey:** D0–D14 surfaces and Cron Worker.
- **OpenNext:** Production deploy of Next.js to Cloudflare (Wrangler + D1 + DO are configured; frontend still `npm run dev` for now).

---

## 8. Webhook test curl (reference)

After `npm run seed:local` and with `npm run dev:api` and a WS client connected to `ws://localhost:8787/api/ws/test-waba`:

```bash
curl -X POST http://localhost:8787/api/webhook/test-waba -H "Content-Type: application/json" -H "X-Hub-Signature-256: sha256=skip" -d "{\"entry\":[{\"changes\":[{\"value\":{\"messages\":[{\"id\":\"m001\",\"from\":\"919876543210\",\"type\":\"text\",\"text\":{\"body\":\"Namaste, property dekhna hai\"},\"timestamp\":\"1700000000\"}],\"contacts\":[{\"profile\":{\"name\":\"Ramesh Kumar\"},\"wa_id\":\"919876543210\"}]}}]}]}"
```

WS client should receive the `new_message` event; `SELECT * FROM messages` in local D1 should show the new row.
