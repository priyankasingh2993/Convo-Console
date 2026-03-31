# What you need to do

Everything below is **your side only** — credentials, dashboard settings, and one-time setup. The codebase is ready.

---

## 1. Cloudflare (once)

From repo root:

```bash
npx wrangler login
```

- **D1:**  
  `npx wrangler d1 create convo-production`  
  Copy the `database_id` from the output → paste it in `wrangler.toml` in place of `PASTE_YOUR_D1_ID_HERE`.

- **KV:**  
  `npx wrangler kv namespace create "convo-kv"`  
  Copy the `id` → paste it in `wrangler.toml` in place of `PASTE_YOUR_KV_ID_HERE`.

- **R2:**  
  Already in wrangler (`convo-media`). No ID to paste.

- **Run D1 schema (local):**  
  `npx wrangler d1 execute convo-production --local --file=schema.sql`

- **Worker secret (required for onboarding API):**  
  `npx wrangler secret put CLERK_SECRET_KEY`  
  Paste your Clerk **Secret key** (same value as in `web/.env.local`).

---

## 2. Clerk (once)

1. **Dashboard:** [dashboard.clerk.com](https://dashboard.clerk.com) → your Convo app (or create one).

2. **API Keys:**  
   In `web/.env.local` you should have:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
   - `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
   - `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/onboarding`
   - `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding`
   - `NEXT_PUBLIC_API_URL=http://localhost:8787`

3. **Session token claim (required for org metadata):**  
   **Sessions** → **Customize session token** → add this claim:
   ```json
   { "org_metadata": "{{org.public_metadata}}" }
   ```

4. **Organizations:**  
   **Organizations** → enable **“Allow users to create organizations”**.

---

## 3. Install and run (every time you clone or pull)

From repo root:

```bash
npm install
cd web && npm install
```

**Terminal 1 (Next.js):**
```bash
npm run dev:web
```
→ http://localhost:3000

**Terminal 2 (Workers API):**
```bash
npm run dev:api
```
→ http://localhost:8787

---

## 4. Optional: test webhook + WebSocket

Only if you want to see a simulated WhatsApp message in the app:

1. Seed local D1 (run once):
   ```bash
   npm run seed:local
   ```

2. With `npm run dev:api` running, in another terminal:
   - Install wscat if needed: `npm install -g wscat`
   - Connect: `wscat -c ws://localhost:8787/api/ws/test-waba`
   - In a third terminal, send the test webhook (see `docs/implementation-status.md` §9 for the full curl).

---

## 5. Later (production / real WhatsApp)

- **Production webhook:** Set `npx wrangler secret put META_APP_SECRET` (from Meta app).
- **Other secrets** (when you add those features): `ENCRYPTION_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`.

---

**Summary:** Paste D1 and KV IDs in `wrangler.toml`, run schema and `wrangler secret put CLERK_SECRET_KEY`, add the Clerk session claim and org setting, then `npm install` and run the two dev servers. Everything else is already in the repo.
