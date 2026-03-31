# Convo — Cursor Master Prompt
## WhatsApp CRM for Indian SMBs · v2.0 · March 2026

---

## WHO YOU ARE

You are the lead engineer building Convo — a WhatsApp CRM for Indian SMBs. You work from the spec in `docs/screen-map-v2.md` and the visual prototype in `docs/console.html`. These two files are your **only** sources of truth.

**Rules:**
- Do not invent screens, navigation items, or features not in the spec
- Do not add message limits, conversation caps, or per-message pricing anywhere
- Do not build mobile-first — desktop-first, responsive collapse at 900px
- Do not call Meta APIs directly from the frontend — all calls go through `/api/*`
- When in doubt, ask before building

---

## TECH STACK (LOCKED — DO NOT CHANGE)

```txt
Frontend:   Next.js 15 (App Router) + TypeScript
Deployment: OpenNext → Cloudflare Workers (via wrangler)
API:        Hono.js on Cloudflare Workers at /api/*
Database:   Cloudflare D1 (SQLite at edge)
Realtime:   Cloudflare Durable Objects (WebSocket per WABA number)
Auth:       Clerk (organisation-based, org metadata stores onboarding answers)
Storage:    Cloudflare R2 (media uploads via presigned URLs)
Payments:   Razorpay (modal checkout for plans + in-chat UPI links)
AI:         Gemini 2.5 Flash via Cloudflare AI Gateway
WhatsApp:   Meta Cloud API — direct, NO BSP, NO third-party markup
KV:         Cloudflare KV (FAS score cache, session data)
Cron:       Cloudflare Cron Triggers (D1/D4/D8/D11/D14 trial journey)
```

---

## DESIGN TOKENS (USE EXACTLY — NO DEVIATIONS)

```css
/* Paste into globals.css — these are non-negotiable */
:root {
  --blue:        #3B6CF4;
  --blue-light:  #5B87FF;
  --blue-dim:    rgba(59,108,244,0.12);
  --midnight:    #0F1117;
  --surface:     #161B27;
  --surface2:    #1E2535;
  --surface3:    #242D42;
  --border:      rgba(255,255,255,0.07);
  --border2:     rgba(255,255,255,0.13);
  --text:        #F0F4FF;
  --text2:       #8A93B2;
  --text3:       #555E7A;
  --green:       #25D366;
  --green-dim:   rgba(37,211,102,0.12);
  --red:         #FF4D6D;
  --amber:       #FFBE57;
  --purple:      #8B5CF6;
}
```

**Typography:**
- Display / headings / logo: `Sora` (600–700)
- Body / labels / messages: `DM Sans` (400–500)
- Load both from Google Fonts

**Border radius:**
- Cards, modals, panels: `12px`
- Buttons, inputs, chips: `8px`
- Avatars, badges, pills: `99px`
- Message bubbles: `13px` with one corner at `3px` (tail)

**Layout widths:**
- Sidebar: `220px`
- Conversation list panel: `280–290px`
- Contact sidebar: `250px`
- Node config panel: `300px`

---

## FOLDER STRUCTURE

```txt
convo/
├── app/                          # Next.js App Router
│   ├── (auth)/
│   │   └── onboarding/           # Post-Clerk-signup 4-question flow
│   ├── (app)/
│   │   ├── layout.tsx            # App shell: sidebar + main
│   │   ├── inbox/page.tsx        # Screen 7-9
│   │   ├── broadcast/page.tsx    # Screen 10-11
│   │   ├── contacts/
│   │   │   ├── page.tsx          # Screen 12
│   │   │   └── [id]/page.tsx     # Screen 13
│   │   ├── playbooks/page.tsx    # Screen 14
│   │   ├── flows/page.tsx        # Screen 17-18 (Month 2)
│   │   ├── analytics/
│   │   │   ├── fas/page.tsx      # Screen 19-20
│   │   │   └── campaigns/page.tsx # Screen 22 (Month 2)
│   │   ├── pipeline/page.tsx     # Screen 23 (Month 3)
│   │   ├── ads/page.tsx          # Screen 24 (Month 3)
│   │   └── settings/
│   │       ├── whatsapp/page.tsx # Screen 15
│   │       ├── billing/page.tsx  # Screen 16
│   │       ├── team/page.tsx
│   │       ├── compliance/page.tsx
│   │       └── api/page.tsx
│   └── api/                      # Hono API routes
│       └── [[...route]]/route.ts
├── components/
│   ├── ui/                       # Primitives: Button, Input, Badge, Modal, etc.
│   ├── inbox/                    # ConvoList, ChatPanel, ContactSidebar
│   ├── broadcast/                # CampaignList, CampaignBuilder (4-step modal)
│   ├── contacts/                 # ContactsTable, ContactDetail
│   ├── onboarding/               # Q1–Q4, LoadingScreen, FirstWinCoach
│   ├── playbooks/                # PlaybookCard, AutomationToggle
│   ├── fas/                      # ScoreHero, FeatureGrid
│   └── shared/                   # Sidebar, Topbar, EmptyState, SkeletonRow
├── lib/
│   ├── db/                       # D1 schema + query helpers
│   ├── do/                       # Durable Object: InboxConnection
│   ├── clerk/                    # Clerk org metadata helpers
│   ├── meta/                     # Meta Cloud API client
│   ├── gemini/                   # Gemini 2.5 Flash client
│   ├── razorpay/                 # Razorpay checkout helpers
│   └── trial/                    # Trial journey state machine
├── workers/
│   ├── api.ts                    # Hono app entry
│   ├── durable-objects/
│   │   └── InboxConnection.ts    # WebSocket DO per WABA number
│   └── cron/
│       └── trial.ts              # D1/D4/D8/D11/D14 triggers
├── docs/
│   ├── screen-map-v2.md          # THE SPEC — source of truth
│   └── console.html              # Visual prototype — reference implementation
├── wrangler.toml
├── next.config.ts
└── package.json
```

---

## BUILD ORDER — MONTH 1 ONLY (DO NOT SKIP AHEAD)

Execute in this exact order. Each item is a prerequisite for the next.

### 1. Durable Object: WebSocket Inbox Connection
**File:** `workers/durable-objects/InboxConnection.ts`

```ts
// One DO instance per WABA phone number
// - Accepts WebSocket upgrades from frontend
// - Receives Meta webhook events from Hono API
// - Broadcasts to all connected clients for that number
// - Stores last 100 message IDs to deduplicate
```

**Done when:** A real WhatsApp message received by the webhook appears in the browser without page refresh.

---

### 2. Clerk Auth + Onboarding (Screens 1–6)
**Flow:** Clerk signup → email verify → land on `/onboarding/q1`

**Onboarding answers saved to Clerk org metadata:**

```ts
interface OnboardingMetadata {
  industry: 'realestate' | 'd2c' | 'education' | 'healthcare' | 'fnb' | 'financial' | 'travel' | 'other'
  goal: 'sales' | 'marketing' | 'support' | 'commerce' | 'all'
  teamSize: 'solo' | '2-5' | '6-20' | '20+'
  tool: 'fresh' | 'wati' | 'interakt' | 'aisensy' | 'gallabox' | 'other'
  switcherTool?: string
  onboardedAt: string  // ISO date
  trialStartDate: string  // ISO date — D0
}
```

**Q4 is a two-step pattern** — selecting "Yes, switching" reveals a sub-picker. See main spec for full details.

**Loading screen (Screen 5):** 4 animated steps, ~5s, personalised from Q1+Q2+Q4. Steps turn green sequentially.

**First-Win Coach (Screen 6):** Content switches completely based on Q2. See spec for all 5 content variants.

**Done when:** 4 answers correctly configure workspace (industry playbook, AI tone, first-win mode). Trial start date written to Clerk org metadata.

---

### 3. App Shell
**File:** `app/(app)/layout.tsx`

Sidebar navigation (220px) + main content area. Sidebar contains:

**CORE section:**
- 💬 Inbox (with unread badge, real-time via DO WebSocket)
- 📢 Broadcast
- 👥 Contacts

**TOOLS section:**
- 🤖 Playbooks
- ⚡ Flow Builder *(Month 2 — show but disable with "Coming soon" tooltip)*

**ANALYTICS section:**
- 📊 FAS Score
- 📈 Campaign Analytics *(Month 2 — disabled)*

**PIPELINE section:**
- 🏠 Lead Pipeline *(Month 3 — disabled)*

**SETTINGS section:**
- ⚙️ Settings

**Sidebar bottom:**
- Trial day counter: `Day 4 of 14 — Trial` in amber
- User avatar + name + role + online dot
- Workspace switcher (org name)

---

### 4. Inbox — Full 3-Panel UI (Screens 7–9)

**Layout:** `ConvoList (290px) | ChatPanel (flex:1) | ContactSidebar (250px)`

**ConvoList (Screen 7):**
- Tabs: All | Mine | Bot
- Each row: avatar (initials, colour-coded) · name · relative timestamp · last message preview · tag chip · unread badge
- Green dot on avatar if within open 24-hour WhatsApp window
- States: default / active (blue-dim background) / hover (surface2) / empty / loading (skeleton shimmer)
- Real-time: sorted by latest activity, updates via DO WebSocket

**ChatPanel (Screen 8):**
- Header: contact name + phone + "Last seen X ago" + 24h window status + action icons (💳 📝 👤 ⋯)
- Messages: inbound left (surface2 bg, tail bottom-left) / outbound right (blue bg, white text, tail bottom-right)
- Date dividers between calendar days
- Message metadata: timestamp + ✓ sent / ✓✓ delivered / ✓✓ blue read
- AI suggestion strip above input: "🤖 AI suggests: [text]" · "Use →" · "×" dismiss. "Use →" populates textarea, does NOT auto-send
- Input footer: tool row (⚡ 📎 💳 🛍️ 😊) + auto-grow textarea + circular send button
- Template picker overlay
- Empty state when no conversation selected: faded Convo logomark + copy

**ContactSidebar (Screen 9):**
- Contact info: phone, source, location, stage pill
- Stage values: New Enquiry / Contacted / Qualified / Site Visit / Negotiation / Converted / Closed Lost
- Assigned To: agent + "Change" link
- FAS Score card: score + level badge (Bronze/Silver/Gold/Platinum) + progress bar + insight
- Notes: inline edit, auto-save
- Send Payment Link button
- Past interactions list

**Done when:** Messages appear in real time, conversation list updates, contact data shows.

---

### 5. Contacts — Table View + CSV Import (Screen 12)

**Columns:** Name (avatar+name) | Phone | Source | Stage | FAS Score pill | Assigned agent | Last Active | Actions (⋯)

**FAS Score pill colours:**
- 70–100: green pill
- 40–69: Electric Blue pill
- 0–39: red pill (#FF4D6D)

**Filter chips:** All | Hot leads | By source | By stage | By agent | Custom filter

**Bulk actions bar** (appears when 1+ rows selected): Bulk assign agent · Bulk tag · Export CSV · Add to broadcast

**CSV Import:** Map uploaded columns to contact fields. Standard fields: name, phone, source, stage, assigned agent, custom attributes.

**Done when:** 248 contacts importable from CSV with correct field mapping.

---

### 6. Broadcast — Campaign List + 4-Step Builder (Screens 10–11)

**Campaign list (Screen 10):**
- Stats row: Messages Sent · Avg Open Rate · Click Rate · "Meta Cost — No BSP markup ✓"
- Filter chips: All | Live | Completed | Draft | Scheduled
- Status dot colours (ALL 4 REQUIRED):
  - Live: pulsing green (#25D366) with CSS glow animation
  - Completed: static grey (#555E7A)
  - Draft: static amber (#FFBE57)
  - Scheduled: static Electric Blue (#3B6CF4) + countdown text

**Campaign builder modal (Screen 11):** 4-step wizard

- **Step 1:** Campaign name + goal selector (Generate replies / Drive site visits / Collect payments / Share information)
- **Step 2:** Template grid, filtered by industry from Q1. Selected: Electric Blue border 1.5px. "+ Create new template" at bottom.
- **Step 3:** Segment chips: All contacts / Hot leads / Needs follow-up / Custom segment. Contact count updates in real time (live COUNT query on D1).
- **Step 4:** WhatsApp preview (dark bubble) + Send now / Schedule + cost estimate ("₹X for Y contacts at ₹0.8631/marketing message") + confirmation dialog

**Done when:** Can send a broadcast to a real segment and see delivery stats update.

---

### 7. Playbooks — Industry Cards + Automation Toggles (Screen 14)

- Industry cards: one per vertical (Real Estate, D2C, Education, Healthcare, F&B, Financial Services, Travel)
- Active card: Electric Blue border, "Active" badge
- Each card expands to show automation list
- Each automation: name + description + toggle (on/off)
- "Activate Playbook" CTA: one-click activation = all automations in that playbook go live

**Done when:** Real Estate playbook activates and its automations are live and functional.

---

### 8. Settings (Screens 15–16 + Team + DPDP + API)

**WhatsApp Connection (Screen 15):**
- Connected number + status (Connected/Disconnected)
- "Meta Cloud API — Direct · No BSP · No markup ✓"
- Webhook URL (read-only + copy button): `https://api.convo.in/webhook/[id]`
- "+ Add another number" → Embedded Signup flow
- Business profile fields: display name, description (256 char), business hours per-day, address, website, profile photo upload
- Green tick section: Unverified / Pending / Verified + "Available on Growth plan and above"

**Billing (Screen 16):**
- ⚠️ ZERO message limits anywhere on this screen
- 4 plan cards: Starter (₹999/mo) · Growth ⭐ (₹2,499/mo) · Scale (₹5,999/mo) · Enterprise (Custom)
- Billing toggle: Monthly | Quarterly (-10%) | Annual (-2 months free)
- Payment section: UPI primary + card backup
- Growth is the recommended plan (highlight badge)

**Team & Agents:** Agent list + invite + roles (Admin/Agent) + routing rules (Round-robin/Manual/Keyword)

**DPDP Compliance:** Consent capture + export contact data + delete contact data (irreversible) + audit log

**API & Webhooks:** Key generation + webhook config + docs link

**Done when:** User can connect a WhatsApp number and pay via Razorpay UPI.

---

### 9. 14-Day Trial Journey (D0–D14)

These are **in-app states**, not separate screens. They surface inside existing screens.

**Always visible:** Trial day counter in sidebar bottom above user section: `Day X of 14 — Trial` in amber.

| Day | What to build |
|-----|--------------|
| D0 | First-win coach (Screen 6, already built above) |
| D1–D3 | Dashboard banner + inbox nudge strip. Content based on Q2 goal. Fires on D1, D2, D3 via cron. |
| D4 | FAS modal fires on first login of D4. Cannot be dismissed without viewing score. |
| D8 | "Your First Week Report" card at top of inbox. Dismissable after reading. |
| D11–D14 | Upgrade banner at top of every screen. Cannot be permanently dismissed. |
| D14 midnight | Dashboard goes read-only. All screens show data, no actions possible. Full-screen upgrade gate with plan comparison. One-click UPI to reactivate. |

**Cron triggers:** Cloudflare Cron Triggers in `workers/cron/trial.ts` fire the D1/D4/D8/D11/D14 WhatsApp messages to owner's personal number.

**Trial state read from:** `organization.publicMetadata.trialStartDate` (Clerk)

**Done when:** Full D0–D14 sequence fires correctly on a test account. D14 read-only gate works.

---

## DATABASE SCHEMA (D1 — CLOUDFLARE SQLITE)

```sql
-- Core tables for Month 1

CREATE TABLE organizations (
  id TEXT PRIMARY KEY,          -- Clerk org ID
  industry TEXT NOT NULL,
  goal TEXT NOT NULL,
  team_size TEXT NOT NULL,
  tool TEXT NOT NULL,
  switcher_tool TEXT,
  trial_start_date TEXT NOT NULL,
  plan TEXT DEFAULT 'trial',
  plan_activated_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE waba_numbers (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  phone_number TEXT NOT NULL,
  display_name TEXT,
  waba_id TEXT NOT NULL,
  access_token TEXT NOT NULL,   -- encrypted
  webhook_verify_token TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE contacts (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  phone TEXT NOT NULL,
  name TEXT,
  source TEXT,                  -- 'csv' | 'whatsapp' | 'ctwa' | 'manual'
  stage TEXT DEFAULT 'new',
  assigned_agent_id TEXT,
  fas_score INTEGER DEFAULT 0,
  last_active_at TEXT,
  custom_attrs TEXT,            -- JSON blob
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(org_id, phone)
);

CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  contact_id TEXT NOT NULL REFERENCES contacts(id),
  waba_number_id TEXT NOT NULL,
  status TEXT DEFAULT 'open',   -- 'open' | 'closed' | 'bot'
  assigned_agent_id TEXT,
  window_expires_at TEXT,       -- 24h or 72h CTWA window
  last_message_at TEXT,
  unread_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,          -- Meta message ID
  conversation_id TEXT NOT NULL REFERENCES conversations(id),
  direction TEXT NOT NULL,      -- 'inbound' | 'outbound'
  type TEXT NOT NULL,           -- 'text' | 'template' | 'image' | 'document' | 'audio'
  content TEXT,                 -- text content
  template_id TEXT,
  media_url TEXT,
  status TEXT DEFAULT 'sent',   -- 'sent' | 'delivered' | 'read' | 'failed'
  sent_by TEXT,                 -- agent_id or 'ai' or 'bot'
  meta_timestamp TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE campaigns (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  goal TEXT NOT NULL,
  template_id TEXT,
  segment_type TEXT,
  segment_filter TEXT,          -- JSON
  status TEXT DEFAULT 'draft',  -- 'draft' | 'scheduled' | 'live' | 'completed'
  scheduled_at TEXT,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  read_count INTEGER DEFAULT 0,
  replied_count INTEGER DEFAULT 0,
  meta_cost_inr REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE agents (
  id TEXT PRIMARY KEY,          -- Clerk user ID
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'agent',    -- 'admin' | 'agent'
  is_online INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX idx_conversations_org ON conversations(org_id, last_message_at DESC);
CREATE INDEX idx_messages_conv ON messages(conversation_id, created_at);
CREATE INDEX idx_contacts_org ON contacts(org_id);
CREATE INDEX idx_campaigns_org ON campaigns(org_id, created_at DESC);
```

---

## DURABLE OBJECT — InboxConnection

```ts
// workers/durable-objects/InboxConnection.ts
// One instance per WABA number (id = waba_number_id)
// Responsible for:
//   1. Maintaining WebSocket connections from browser clients
//   2. Receiving forwarded webhook events from Hono API
//   3. Broadcasting new messages to all connected clients
//   4. Updating unread counts in real time

export class InboxConnection implements DurableObject {
  private sessions: Set<WebSocket> = new Set();
  
  async fetch(request: Request) {
    const url = new URL(request.url);
    
    if (url.pathname === '/connect') {
      // WebSocket upgrade from browser
      const pair = new WebSocketPair();
      this.sessions.add(pair[1]);
      pair[1].accept();
      pair[1].addEventListener('close', () => this.sessions.delete(pair[1]));
      return new Response(null, { status: 101, webSocket: pair[0] });
    }
    
    if (url.pathname === '/broadcast') {
      // Called by Hono webhook handler when new message arrives
      const event = await request.json();
      this.sessions.forEach(ws => ws.send(JSON.stringify(event)));
      return new Response('ok');
    }
    
    return new Response('not found', { status: 404 });
  }
}
```

---

## HONO API STRUCTURE

```ts
// workers/api.ts
import { Hono } from 'hono'

const app = new Hono()

// Meta webhook verification + event handling
app.get('/api/webhook/:wabaId', verifyWebhook)
app.post('/api/webhook/:wabaId', handleWebhookEvent)  // forwards to DO

// Conversations
app.get('/api/conversations', listConversations)
app.get('/api/conversations/:id/messages', getMessages)
app.post('/api/conversations/:id/messages', sendMessage)
app.post('/api/conversations/:id/assign', assignAgent)

// Contacts
app.get('/api/contacts', listContacts)
app.post('/api/contacts', createContact)
app.put('/api/contacts/:id', updateContact)
app.post('/api/contacts/import', importCSV)

// Campaigns
app.get('/api/campaigns', listCampaigns)
app.post('/api/campaigns', createCampaign)
app.post('/api/campaigns/:id/send', sendCampaign)
app.get('/api/campaigns/:id/stats', getCampaignStats)

// Templates
app.get('/api/templates', listTemplates)
app.post('/api/templates', submitTemplate)

// FAS Score
app.get('/api/fas', getFASScore)
app.post('/api/fas/event', recordFASEvent)

// Billing
app.post('/api/billing/checkout', createRazorpayCheckout)
app.post('/api/billing/verify', verifyRazorpayPayment)

// Onboarding
app.post('/api/onboarding/complete', saveOnboardingAnswers)
```

---

## COMPONENT PATTERNS

### Empty States

Every list view must have an empty state. Use this pattern:

```tsx
<EmptyState
  icon="💬"  // contextual emoji
  title="No conversations yet"
  description="Customers who message your number appear here."
  cta={{ label: "Connect WhatsApp →", href: "/settings/whatsapp" }}
/>
```

See main spec for copy for every screen.

### Skeleton Loading

All data tables and lists show skeleton shimmer rows on first paint:

```tsx
<SkeletonRow />  // height 52px, shimmer animation
```

### Trial Day Counter

Always visible in sidebar bottom above user section:

```tsx
<TrialBadge day={4} total={14} />
// Renders: "Day 4 of 14 — Trial" in amber
// On D11+: pulsing amber + "Upgrade now" link
// On D14: red + "Trial expired"
```

---

## WHAT CAN BE MOCKED IN PHASE 1

- **AI suggestions in chat:** Hardcode 2–3 per industry. Real Gemini integration is Month 2.
- **FAS Score calculation:** Mock score (e.g., 34/100, Bronze) until real event tracking is built.
- **Campaign delivery stats:** Static placeholder data. Real Meta webhook data fills it in as it arrives.
- **Flow Builder canvas:** Month 2 — show "Coming soon" placeholder with a preview image.
- **CTWA Ads:** Month 3 — "Connect Meta Ads" placeholder screen only.
- **Agent Performance Dashboard:** Month 3 — placeholder.
- **Migration Assistant:** Month 2 — placeholder after onboarding for switchers.

---

## ENVIRONMENT VARIABLES

```bash
# .env.local (Next.js)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/onboarding/q1
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding/q1

# wrangler.toml (Cloudflare Workers)
RAZORPAY_KEY_ID=rzp_...
RAZORPAY_KEY_SECRET=...
GEMINI_API_KEY=...
META_APP_SECRET=...
CLERK_SECRET_KEY=...  # for server-side Clerk SDK
```

---

## CLERK MIDDLEWARE

```ts
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)', '/sign-up(.*)', '/api/webhook/(.*)'
])

const isOnboardingRoute = createRouteMatcher(['/onboarding(.*)'])

export default clerkMiddleware(async (auth, req) => {
  const { userId, orgId, sessionClaims } = await auth()
  
  // Redirect unauthenticated to sign-in
  if (!isPublicRoute(req) && !userId) {
    return auth.redirectToSignIn()
  }
  
  // Redirect authenticated users without onboarding to onboarding
  if (userId && !isOnboardingRoute(req) && !isPublicRoute(req)) {
    const metadata = sessionClaims?.org_metadata as any
    if (!metadata?.onboardedAt) {
      return Response.redirect(new URL('/onboarding/q1', req.url))
    }
  }
})

export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)', '/(api|trpc)(.*)']
}
```

---

## WRANGLER CONFIG

```toml
# wrangler.toml
name = "convo-api"
main = "workers/api.ts"
compatibility_date = "2025-03-01"
compatibility_flags = ["nodejs_compat"]

[[d1_databases]]
binding = "DB"
database_name = "convo-production"
database_id = "YOUR_D1_DATABASE_ID"

[[kv_namespaces]]
binding = "KV"
id = "YOUR_KV_NAMESPACE_ID"

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
crons = ["0 0 * * *"]  # Daily trial journey cron — filters by day offset in handler
```

---

## NEXT.JS CONFIG

```ts
// next.config.ts
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'

initOpenNextCloudflareForDev()

const nextConfig = {
  // Next.js 15 defaults
}

export default nextConfig
```

---

## QUALITY BAR FOR EVERY SCREEN

Before marking any screen done, it must pass:
- [ ] All states built: empty, loading (skeleton shimmer), error, and populated
- [ ] Design tokens used correctly — no hardcoded hex values in components
- [ ] Sora for headings/logo/stats, DM Sans for body
- [ ] Real-time data (where applicable) — not simulated with setTimeout
- [ ] No message limits, caps, or per-conversation pricing visible anywhere
- [ ] Responsive collapse at 900px (panels stack or hide)
- [ ] TypeScript — no `any` types except where explicitly noted above

---

## REFERENCE FILES

- `docs/screen-map-v2.md` — Complete spec, every screen, every state, every interaction
- `docs/console.html` — Working visual prototype with all design tokens and component patterns implemented. Use this as visual ground truth. Translate its patterns into React components.

**When the spec and prototype disagree, the spec wins.**

---

*End of Cursor Master Prompt — v1.0*  
*Any deviation from this document requires co-founder sign-off.*

