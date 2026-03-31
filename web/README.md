# Convo Web (Next.js 15)

WhatsApp CRM for Indian SMBs — frontend app. Built to the [Screen Map & Cursor Handoff Spec](https://convo.njaiswal78.workers.dev/) v2.0.

## Stack

- **Next.js 15** (App Router)
- **React 19**
- Design tokens from spec (Section 13): Sora + DM Sans, Convo colour palette

## What’s included

- **Onboarding (Screens 1–6):** 4-question flow (Industry → Goal → Team size → Current tool with two-step Q4), loading screen with personalised steps, first-win coach content by goal (Sales / Marketing / Support / Commerce / All).
- **Dashboard shell:** Placeholder at `/dashboard`; Inbox, Broadcast, Contacts follow Month 1 build order.

## Run locally

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Root redirects to `/onboarding`.

## Build

```bash
npm run build
```

## Deploy

- **Static prototype (current):** From repo root, `wrangler pages deploy . --project-name=convo-console` deploys `index.html`.
- **Next.js (later):** Use OpenNext → Cloudflare Workers, or build and deploy the `out` or `.next` output per your pipeline.
