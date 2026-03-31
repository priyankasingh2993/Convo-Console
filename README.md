# Convo

WhatsApp CRM for Indian SMBs. Next.js 15 (web) + Hono on Cloudflare Workers (API), D1, Durable Objects, Clerk.

## Quick start

1. **Your setup (one-time):** See **[docs/YOUR-CHECKLIST.md](docs/YOUR-CHECKLIST.md)** — Cloudflare D1/KV IDs, Clerk keys, session claim.
2. From repo root: `npm install` then `cd web && npm install`.
3. **Terminal 1:** `npm run dev:web` → http://localhost:3000  
   **Terminal 2:** `npm run dev:api` → http://localhost:8787

Spec: [docs/screen-map-v2.md](docs/screen-map-v2.md). Status: [docs/implementation-status.md](docs/implementation-status.md).
