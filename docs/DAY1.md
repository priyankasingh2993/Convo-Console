# Convo — Day 1
## The only plan. Use this. Ignore any other Day 1 document.

---

## WHERE YOU ARE RIGHT NOW

| Already done ✅ | Not done ❌ |
|----------------|------------|
| Static prototype live at https://convo.njaiswal78.workers.dev/ | Clerk auth not wired |
| Next.js 15 app scaffolded in `web/` | D1 / KV / R2 not created |
| Design tokens in `web/src/app/globals.css` | Hono API is stubs only |
| Onboarding Q1–Q4 UI built | Durable Object not wired |
| Loading screen (Screen 5) built | App shell (sidebar) not built |
| First-Win Coach (Screen 6) built | No real-time inbox |
| Dashboard placeholder at `/dashboard` | |

**Today's goal:** Environment live + Clerk wired + DO proven + App shell up.
By end of day you should be able to sign up, complete onboarding, land in the real app shell, and receive a simulated real-time event in the browser.

---

## BEFORE CURSOR — Do this yourself (45 min total)

### Step A: Install packages (5 min)
```bash
cd web
npm install @clerk/nextjs @opennextjs/cloudflare hono jose
npm install --save-dev @cloudflare/workers-types
cd ..
```

Verify: `cd web && npm run dev` — should still start clean on :3000.

---

### Step B: Create Cloudflare resources (20 min)
```bash
# From repo root
npx wrangler login

# D1 database
npx wrangler d1 create convo-production
# → copy the database_id it prints

# KV namespace
npx wrangler kv namespace create "convo-kv"
# → copy the id it prints

# R2 bucket
npx wrangler r2 bucket create convo-media
```

Now manually create `wrangler.toml` at repo root — paste this exactly, fill in your IDs:
```toml
name = "convo-api"
main = "workers/api.ts"
compatibility_date = "2025-03-01"
compatibility_flags = ["nodejs_compat"]

[[d1_databases]]
binding = "DB"
database_name = "convo-production"
database_id = "PASTE_YOUR_D1_ID_HERE"

[[kv_namespaces]]
binding = "KV"
id = "PASTE_YOUR_KV_ID_HERE"

[[r2_buckets]]
binding = "R2"
bucket_name = "convo-media"

[durable_objects]
bindings = [
  { name = "INBOX", class_name = "InboxConnection" }
]

[[migrations]]
tag = "v1"
new_classes = ["InboxConnection"]

[triggers]
crons = ["0 0 * * *"]

[vars]
ENVIRONMENT = "development"
```

Run the schema:
```bash
npx wrangler d1 execute convo-production --local --file=web/src/lib/db/schema.sql

# Verify — should print 14 table names
npx wrangler d1 execute convo-production --local \
  --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
```

Set secrets:
```bash
npx wrangler secret put CLERK_SECRET_KEY
npx wrangler secret put META_APP_SECRET
npx wrangler secret put ENCRYPTION_KEY    # generate: openssl rand -hex 32
npx wrangler secret put RAZORPAY_KEY_ID
npx wrangler secret put RAZORPAY_KEY_SECRET
```

---

### Step C: Create Clerk app (15 min)
1. [dashboard.clerk.com](https://dashboard.clerk.com) → **Add application** → Name: `Convo`
2. Enable Email sign-in → **Create application**
3. **API Keys** → create `web/.env.local`:
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/onboarding
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
NEXT_PUBLIC_API_URL=http://localhost:8787
```
4. **Sessions → Customize session token** → add claim:
```json
{ "org_metadata": "{{org.public_metadata}}" }
```
5. **Organizations** → Enable: ✅ Allow users to create organizations

---

### Step D: Verify both servers start (5 min)
```bash
# Terminal 1
cd web && npm run dev          # → http://localhost:3000

# Terminal 2 (repo root)
npx wrangler dev workers/api.ts --local   # → http://localhost:8787

# Quick check
curl http://localhost:8787/health
# Should return: {"status":"ok","ts":"..."}
```

If Terminal 2 fails — fix it before calling Cursor. Do not move forward with a broken API.

---

## OPEN CURSOR — Keep both terminals running all day

**First message to Cursor (paste this once at start of session):**

```
Read CURSOR_MASTER_PROMPT.md fully before doing anything.

Once you've read it, confirm by listing:
1. The 9 Month 1 build items in order
2. The actual folder where the Next.js app lives
3. Which 3 lib files you must NOT rewrite (they're already scaffolded)
```

Wait for the correct answers before pasting any task.

---

## TASK 1 — Wire Clerk into the existing onboarding (1 hour)

```
TASK 1: Wire Clerk auth into the existing Next.js app

CURRENT STATE:
- Onboarding UI is complete in web/src/app/onboarding/OnboardingClient.tsx
- It stores answers in React state only — no Clerk, no API call
- @clerk/nextjs is now installed. Keys are in web/.env.local.

DO NOT rewrite OnboardingClient.tsx. Wrap it and add the API call only.

WHAT TO BUILD:

1. ClerkProvider in web/src/app/layout.tsx:
   Import ClerkProvider from @clerk/nextjs and wrap the existing layout.

2. Sign-in page: web/src/app/sign-in/[[...sign-in]]/page.tsx
   Sign-up page: web/src/app/sign-up/[[...sign-up]]/page.tsx
   Both render Clerk's <SignIn /> / <SignUp /> components.
   Wrap in a centered full-screen container using --midnight background.
   Card uses --surface background, border-radius 20px, border 1px solid --border2.

3. Middleware: web/src/middleware.ts
```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)', '/sign-up(.*)', '/api/webhook/(.*)'
])
const isOnboardingRoute = createRouteMatcher(['/onboarding(.*)'])

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth()
  if (isPublicRoute(req)) return NextResponse.next()
  if (!userId) return auth.redirectToSignIn({ returnBackUrl: req.url })
  const meta = (sessionClaims?.org_metadata ?? {}) as Record<string, unknown>
  if (!meta?.onboardedAt && !isOnboardingRoute(req)) {
    return NextResponse.redirect(new URL('/onboarding', req.url))
  }
  if (meta?.onboardedAt && isOnboardingRoute(req)) {
    return NextResponse.redirect(new URL('/inbox', req.url))
  }
  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv)).*)', '/(api|trpc)(.*)'],
}
```

4. Add phone capture step (4.5) in OnboardingClient.tsx:
   - Insert a new step between Q4 and the loading screen
   - Heading: "One last thing"
   - Subtext: "What's your personal WhatsApp number? We'll send your trial updates here."
   - Input: +91 prefix + 10-digit field (validate exactly 10 digits)
   - "Skip for now" link (right aligned, --text3 colour) — proceeds without saving
   - "Continue →" primary button
   - Stores as ownerPhone in the answers state object

5. Wire the completion API call in OnboardingClient.tsx:
   The "Go to my dashboard →" button currently calls router.push('/dashboard').
   Change it to first POST to the API then redirect:
```typescript
import { useAuth } from '@clerk/nextjs'
const { getToken } = useAuth()

async function handleComplete() {
  const token = await getToken()
  await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/onboarding/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      industry: answers.industry,
      goal: answers.goal,
      teamSize: answers.teamSize,
      tool: answers.tool,
      switcherTool: answers.switcherTool ?? null,
      ownerPhone: answers.ownerPhone ?? null,
    }),
  })
  router.push('/inbox')
}
```

6. Update web/src/app/page.tsx:
   Change redirect target from /onboarding to /sign-up

DONE WHEN:
- / → /sign-up (Clerk form, dark themed)
- Sign up with email → /onboarding (existing UI, unchanged)
- Q1→Q2→Q3→Q4→phone capture→loading→coach all work
- "Go to my dashboard →" fires the POST (visible in Network tab) then goes to /inbox
- Signing in again goes directly to /inbox (middleware redirects onboarded users)
```

---

## TASK 2 — Durable Object + Webhook Handler (2–3 hours)

```
TASK 2: Complete the Durable Object and Hono webhook handler

CONTEXT:
- workers/durable-objects/InboxConnection.ts exists at repo root — review it
- workers/api.ts exists at repo root with stubs — implement the real logic
- All lib files are in web/src/lib/ — import using relative paths from workers/:
  e.g. import { verifyMetaSignature } from '../web/src/lib/meta/verify'
- D1, KV, R2 are provisioned. Schema is migrated (14 tables exist).

WHAT TO BUILD:

1. Review workers/durable-objects/InboxConnection.ts
   It should already handle:
   - GET /connect → WebSocket upgrade, accept, add to sessions Set
   - POST /broadcast → fan out JSON payload to all connected sessions
   - Heartbeat: ws.onmessage 'ping' → send 'pong'
   - Deduplication: Set of last 100 meta_message_ids, skip if seen
   - Clean up: sessions.delete(ws) on close and error
   If any of these are missing, add them. Do not change what's already correct.

2. Complete GET /api/webhook/:wabaNumberId in workers/api.ts:
   - Read hub.mode, hub.verify_token, hub.challenge from query params
   - SELECT webhook_verify_token FROM waba_numbers WHERE id = :wabaNumberId
   - If hub.mode === 'subscribe' and tokens match: return hub.challenge as plain text
   - Otherwise: return 403

3. Complete POST /api/webhook/:wabaNumberId in workers/api.ts:
   STEP 1 — Signature verification (non-negotiable):
     const bodyText = await c.req.text()
     const sig = c.req.header('X-Hub-Signature-256') ?? ''
     // In development (ENVIRONMENT=development), skip verification for testing
     if (c.env.ENVIRONMENT !== 'development') {
       const valid = await verifyMetaSignature(bodyText, sig, c.env.META_APP_SECRET)
       if (!valid) return c.json({ error: 'Invalid signature' }, 401)
     }
     const body = JSON.parse(bodyText)

   STEP 2 — For each entry → change → value:
     a. If value.messages exists (new inbound message):
        - Get org_id: SELECT org_id FROM waba_numbers WHERE id = :wabaNumberId
        - Generate contactId = crypto.randomUUID()
        - Upsert contact: INSERT OR IGNORE INTO contacts(id, org_id, phone, name, source) VALUES(?,?,?,?,?)
          phone = message.from, name = contacts[0].profile.name, source = 'whatsapp'
        - Get existing contact id: SELECT id FROM contacts WHERE org_id=? AND phone=?
        - Generate convId = crypto.randomUUID()
        - Upsert conversation: INSERT OR IGNORE INTO conversations(id, org_id, contact_id, waba_number_id)
        - Update conversation: SET last_message_at=datetime('now'), unread_count=unread_count+1,
            window_expires_at=datetime('now','+24 hours'), window_type='standard'
          WHERE org_id=? AND contact_id=?
        - Insert message: INSERT OR IGNORE INTO messages(id, conversation_id, direction, type, content,
            meta_message_id, meta_timestamp, created_at) VALUES(...)
          id = crypto.randomUUID(), direction='inbound', meta_message_id = message.id
        - Forward to DO:
            const doId = c.env.INBOX.idFromName(wabaNumberId)
            const stub = c.env.INBOX.get(doId)
            await stub.fetch('http://do/broadcast', {
              method: 'POST',
              body: JSON.stringify({ type: 'new_message', payload: { message, contact, conversation, wabaNumberId } })
            })

     b. If value.statuses exists (status update):
        - UPDATE messages SET status=? WHERE meta_message_id=?
          status mapping: 'sent'→'sent', 'delivered'→'delivered', 'read'→'read', 'failed'→'failed'
        - Forward to DO: { type: 'message_status', payload: { messageId: status.id, status: status.status } }

4. WebSocket proxy: GET /api/ws/:wabaNumberId in workers/api.ts:
   - Forward WebSocket upgrade to DO:
     const doId = c.env.INBOX.idFromName(c.req.param('wabaNumberId'))
     const stub = c.env.INBOX.get(doId)
     return stub.fetch(c.req.raw)

5. Complete POST /api/onboarding/complete in workers/api.ts:
   Body: { industry, goal, teamSize, tool, switcherTool, ownerPhone }
   - The Clerk user's org ID comes from the session token. For now, generate a new orgId = crypto.randomUUID() if none exists.
   - INSERT INTO organizations(id, industry, goal, team_size, tool, switcher_tool, owner_phone, trial_start_date, plan)
     VALUES(orgId, industry, goal, teamSize, tool, switcherTool, ownerPhone, datetime('now'), 'trial')
   - Call Clerk to set org metadata:
     PATCH https://api.clerk.com/v1/organizations/{orgId}/metadata
     Authorization: Bearer {CLERK_SECRET_KEY from env}
     Body: { public_metadata: { industry, goal, teamSize, tool, onboardedAt: new Date().toISOString(), trialStartDate: new Date().toISOString() } }
   - Return { status: 'ok', trialStartDate: new Date().toISOString() }

DONE WHEN:
1. npx wrangler dev workers/api.ts --local starts on :8787 with no errors
2. curl http://localhost:8787/health → {"status":"ok"}
3. WebSocket test: wscat -c ws://localhost:8787/api/ws/test-waba-id — stays open, no error
4. Webhook simulation → event appears on WS client:
   curl -X POST http://localhost:8787/api/webhook/test-waba \
     -H "Content-Type: application/json" \
     -H "X-Hub-Signature-256: sha256=skip" \
     -d '{"entry":[{"changes":[{"value":{"messages":[{"id":"m001","from":"919876543210","type":"text","text":{"body":"Namaste, property dekhna hai"},"timestamp":"1700000000"}],"contacts":[{"profile":{"name":"Ramesh Kumar"},"wa_id":"919876543210"}]}}]}]}}'
   WS client should receive: {"type":"new_message","payload":{...}}
5. Check D1: npx wrangler d1 execute convo-production --local --command "SELECT * FROM messages"
   Should show the inserted message row.

TENANT ISOLATION REMINDER: every D1 query that reads/writes user data MUST
include WHERE org_id = ? bound to a verified org. No exceptions.
```

---

## TASK 3 — Real App Shell: Sidebar + Layout (1.5 hours)

```
TASK 3: Build the real app shell — sidebar + layout

CONTEXT:
- Tasks 1 and 2 are done. Auth works, DO works.
- web/src/app/dashboard/ is a placeholder — we're replacing it with (app)/ route group
- Visual reference: docs/console.html — open in browser, find the #app and .sb sections
- All design tokens are in web/src/app/globals.css — use them, no hardcoded hex values

RESTRUCTURE:
- Rename web/src/app/dashboard/ → web/src/app/(app)/
- Create web/src/app/(app)/layout.tsx as the persistent shell

WHAT TO BUILD:

1. web/src/app/(app)/layout.tsx
   flex-row, full viewport height (100dvh), overflow hidden, background var(--midnight)
   Left: <Sidebar /> component, 220px, flex-shrink 0
   Right: <main> flex:1, min-width:0, overflow hidden, flex-col

2. web/src/components/shared/Sidebar.tsx
   Match docs/console.html .sb section exactly.

   a) Logo row — 18px 14px padding, border-bottom 1px solid var(--border):
      30×30 blue square logomark (border-radius 8px, background var(--blue))
      White 💬 icon centred inside
      "Convo" text — Sora 700 16px var(--text)

   b) Workspace switcher — 10px margin, background var(--surface2), border-radius 8px, padding 7px 9px:
      22×22 org avatar: gradient square (135deg, #3B6CF4→#7B5EA7), border-radius 6px
      First 2 letters of org name, 10px bold white, uppercase
      Org name 11px 600 var(--text) truncated
      Chevron ▾ icon var(--text3) 10px

   c) Nav (flex:1, overflow-y auto, padding 6px 9px, gap 2px):
      Section label: display block, 10px 700, letter-spacing 1.2px, uppercase, var(--text3), margin 12px 0 4px 6px

      CORE
      💬 Inbox → /inbox (+ unread badge: blue circle, 10px Sora bold white)
      📢 Broadcast → /broadcast
      👥 Contacts → /contacts

      TOOLS
      🤖 Playbooks → /playbooks
      ⚡ Flow Builder → disabled: opacity 0.38, cursor not-allowed, pointer-events none
         tooltip on hover: "Coming in Month 2" (title attribute is fine)

      ANALYTICS
      📊 FAS Score → /analytics/fas
      📈 Campaign Analytics → disabled (same as above, "Month 2")

      PIPELINE
      🏠 Lead Pipeline → disabled ("Month 3")

      SETTINGS
      ⚙️ Settings → /settings

      Nav item: padding 6px 9px, border-radius 7px, flex-row, gap 8px, cursor pointer
      Icon: 15px, width 18px text-align center, var(--text3)
      Label: 12px 500 var(--text2)
      Active state (current pathname matches): background var(--blue-dim), label colour var(--blue-light), icon colour var(--blue)
      Hover: background var(--surface2)

   d) Bottom — border-top 1px solid var(--border), padding 10px 9px:

      TrialBadge (show only if plan === 'trial'):
        Read trialStartDate from Clerk: useAuth() → sessionClaims?.org_metadata?.trialStartDate
        daysSince = Math.floor((Date.now() - new Date(trialStartDate).getTime()) / 86400000)
        Render: "Day {daysSince} of 14 — Trial"
        Colour: var(--amber) for days 1–10
        Days 11–13: var(--amber) + CSS pulse animation + small "Upgrade →" link var(--blue-light) right-aligned
        Day 14+: var(--red) + "Trial expired"
        Entire badge is clickable → /settings/billing

      User row — padding 7px 9px, border-radius 8px, hover background var(--surface2):
        28px circle avatar (gradient, user initials from Clerk useUser())
        Name: 11px 600 var(--text), Role: 10px var(--text3) (role from Clerk org membership)
        7px green dot: var(--green), border 2px solid var(--surface), border-radius 99px

3. Placeholder pages with correct empty state copy:
   Create these files — each just renders a centred EmptyState component:

   web/src/app/(app)/inbox/page.tsx
   → icon 💬, title "No conversations yet", desc "Customers who message your number appear here.", cta "Connect WhatsApp →" → /settings/whatsapp

   web/src/app/(app)/broadcast/page.tsx
   → icon 📢, title "No campaigns yet", desc "Send your first broadcast in minutes.", cta "New Campaign →" (opens builder)

   web/src/app/(app)/contacts/page.tsx
   → icon 👥, title "No contacts yet", desc "Upload a CSV or let WhatsApp build your list automatically.", cta "Import CSV →"

   web/src/app/(app)/playbooks/page.tsx
   → icon 🤖, title "Playbooks", desc "Industry automation packs — activate in one click." (no empty state, just placeholder)

   web/src/app/(app)/analytics/fas/page.tsx
   → icon 📊, title "FAS Score", desc "Your feature adoption score will appear after your first conversation."

   web/src/app/(app)/settings/page.tsx
   → redirect to /settings/whatsapp

4. First create a shared EmptyState component:
   web/src/components/ui/EmptyState.tsx
   Props: icon (string emoji), title (string), desc (string), cta? ({ label: string, href?: string, onClick?: () => void })
   Centred in parent, gap 12px, icon 32px, title Sora 600 16px var(--text), desc 13px var(--text2), cta button --blue

DONE WHEN:
1. /inbox loads, sidebar visible at 220px
2. Active route highlights correctly (blue-dim bg, blue-light label)
3. Disabled items do not navigate, show tooltip text on hover
4. Trial badge shows correct day count or hides if plan !== 'trial'
5. User avatar shows initials from Clerk user
6. All 6 placeholder pages load with correct empty state copy — no 404s
```

---

## END OF DAY 1 — Checklist

**Infrastructure ✅**
- [x] D1 created and schema migrated (15 tables in schema; run `wrangler d1 execute ... --local --file=schema.sql`)
- [ ] KV + R2 created, wrangler.toml filled with **real** IDs (replace PASTE_YOUR_* placeholders)
- [ ] All 5 secrets set via wrangler secret put (CLERK_SECRET_KEY required; META_APP_SECRET for production webhook)
- [x] Clerk app created, session claim `org_metadata` configured, keys in web/.env.local

**Task 1 — Clerk + Onboarding ✅**
- [x] `/` → `/sign-up` (dark themed Clerk form)
- [x] Sign up → `/onboarding` → all 4 questions work
- [x] Phone capture step (4.5) appears between Q4 and loading
- [x] "Go to my dashboard" fires POST /api/onboarding/complete (with Bearer token) then redirects to /inbox
- [x] Row in D1 organizations table after completion; Clerk org metadata PATCHed (onboardedAt, trialStartDate, etc.)
- [x] Signed-in user visiting /onboarding → redirects to /inbox

**Task 2 — Durable Object ✅**
- [x] wrangler dev workers/api.ts starts on :8787
- [x] WebSocket connects to ws://localhost:8787/api/ws/:wabaNumberId (forwards to DO /connect)
- [x] GET/POST /api/webhook/:wabaNumberId implemented (verify token, parse messages/statuses, D1 upsert, DO broadcast)
- [x] InboxConnection: heartbeat (ping→pong), dedupe (last 100 meta_message_ids)
- [ ] **You verify:** Seed test org + waba (see docs/implementation-status.md §9), then simulated webhook → event on WS client and row in D1 messages

**Task 3 — App Shell ✅**
- [x] Sidebar renders at 220px with all nav items
- [x] Active state highlights correctly on current route
- [x] Disabled items (Flow Builder, Analytics, Pipeline) show tooltip, don't navigate
- [x] Trial badge shows day count (from org_metadata.trialStartDate)
- [x] All 6 placeholder pages load with correct empty state; settings redirects to /settings/whatsapp; whatsapp + billing placeholder pages exist

---

## TWO TERMINALS — KEEP OPEN ALL DAY

```bash
# Terminal 1 — Next.js
cd web && npm run dev          # http://localhost:3000

# Terminal 2 — Hono Workers API
npx wrangler dev workers/api.ts --local   # http://localhost:8787
```

Any "connection refused" → Terminal 2 is down. Restart it.
Any "404 on /api/*" → route not yet implemented in workers/api.ts.

---

## DAY 2

The inbox. Screens 7, 8, 9. Real-time messages via the DO WebSocket hook.
By end of Day 2: receive a real WhatsApp message and watch it appear in the browser without refresh.
That is the product becoming real.
