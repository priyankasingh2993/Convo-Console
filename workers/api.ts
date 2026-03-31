import { Hono } from "hono";
import { cors } from "hono/cors";
import type { D1Database, DurableObjectNamespace } from "@cloudflare/workers-types";
import * as jose from "jose";

type Env = {
  DB: D1Database;
  ENVIRONMENT: string;
  CLERK_SECRET_KEY: string;
  INBOX: DurableObjectNamespace;
  META_APP_SECRET?: string;
};

type WebhookBody = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<{ id: string; from: string; type: string; text?: { body: string }; timestamp: string }>;
        contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
        statuses?: Array<{ id: string; status: string }>;
      };
    }>;
  }>;
};

async function verifyMetaSignature(
  body: string,
  signatureHeader: string,
  secret: string
): Promise<boolean> {
  const prefix = "sha256=";
  if (!signatureHeader.startsWith(prefix)) return false;
  const expectedSig = signatureHeader.slice(prefix.length);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(body)
  );
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex === expectedSig;
}

const app = new Hono<{ Bindings: Env }>();

app.use(
  "/*",
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

app.get("/health", (c) => {
  return c.json({
    status: "ok",
    ts: new Date().toISOString(),
  });
});

app.get("/api/webhook/:wabaNumberId", async (c) => {
  const wabaNumberId = c.req.param("wabaNumberId");
  const mode = c.req.query("hub.mode");
  const token = c.req.query("hub.verify_token");
  const challenge = c.req.query("hub.challenge");
  if (mode !== "subscribe" || !challenge) {
    return c.text("Forbidden", 403);
  }
  const row = await c.env.DB.prepare(
    "SELECT webhook_verify_token FROM waba_numbers WHERE id = ?"
  )
    .bind(wabaNumberId)
    .first<{ webhook_verify_token: string }>();
  if (!row || row.webhook_verify_token !== token) {
    return c.text("Forbidden", 403);
  }
  return c.text(challenge);
});

app.post("/api/webhook/:wabaNumberId", async (c) => {
  const wabaNumberId = c.req.param("wabaNumberId");
  const bodyText = await c.req.text();
  const sig = c.req.header("X-Hub-Signature-256") ?? "";
  if (c.env.ENVIRONMENT !== "development") {
    const secret = c.env.META_APP_SECRET;
    if (!secret) return c.json({ error: "Missing META_APP_SECRET" }, 500);
    const valid = await verifyMetaSignature(bodyText, sig, secret);
    if (!valid) return c.json({ error: "Invalid signature" }, 401);
  }
  let body: WebhookBody;
  try {
    body = JSON.parse(bodyText) as WebhookBody;
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }

  const wabaRow = await c.env.DB.prepare(
    "SELECT org_id FROM waba_numbers WHERE id = ?"
  )
    .bind(wabaNumberId)
    .first<{ org_id: string }>();
  if (!wabaRow) return c.json({ error: "Unknown waba" }, 404);

  const orgId = wabaRow.org_id;

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value) continue;

      if (value.messages) {
        for (const message of value.messages) {
          const from = message.from;
          const contactName =
            value.contacts?.[0]?.profile?.name ?? value.contacts?.[0]?.wa_id ?? from;
          const contactId = crypto.randomUUID();
          await c.env.DB.prepare(
            `INSERT OR IGNORE INTO contacts (id, org_id, phone, name, source)
             VALUES (?, ?, ?, ?, 'whatsapp')`
          )
            .bind(contactId, orgId, from, contactName)
            .run();
          const existingContact = await c.env.DB.prepare(
            "SELECT id FROM contacts WHERE org_id = ? AND phone = ?"
          )
            .bind(orgId, from)
            .first<{ id: string }>();
          const resolvedContactId = existingContact?.id ?? contactId;

          let convId: string;
          const existingConv = await c.env.DB.prepare(
            "SELECT id FROM conversations WHERE org_id = ? AND contact_id = ? AND waba_number_id = ?"
          )
            .bind(orgId, resolvedContactId, wabaNumberId)
            .first<{ id: string }>();
          if (existingConv) {
            convId = existingConv.id;
          } else {
            convId = crypto.randomUUID();
            await c.env.DB.prepare(
              `INSERT INTO conversations (id, org_id, contact_id, waba_number_id)
               VALUES (?, ?, ?, ?)`
            )
              .bind(convId, orgId, resolvedContactId, wabaNumberId)
              .run();
          }

          const now = new Date().toISOString();
          const windowExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
          await c.env.DB.prepare(
            `UPDATE conversations SET last_message_at = ?, unread_count = unread_count + 1,
             window_expires_at = ?, window_type = 'standard' WHERE id = ?`
          )
            .bind(now, windowExpires, convId)
            .run();

          const msgId = crypto.randomUUID();
          const msgType = message.type;
          const content = message.text?.body ?? null;
          await c.env.DB.prepare(
            `INSERT INTO messages (id, conversation_id, direction, type, content, meta_message_id, meta_timestamp, created_at)
             VALUES (?, ?, 'inbound', ?, ?, ?, ?, ?)`
          )
            .bind(msgId, convId, msgType, content, message.id, message.timestamp, now)
            .run();

          const doId = c.env.INBOX.idFromName(wabaNumberId);
          const stub = c.env.INBOX.get(doId);
          await stub.fetch("http://do/broadcast", {
            method: "POST",
            body: JSON.stringify({
              type: "new_message",
              payload: {
                message: { id: msgId, meta_message_id: message.id, type: msgType, content, from },
                contact: { id: resolvedContactId, phone: from, name: contactName },
                conversation: { id: convId },
                wabaNumberId,
              },
            }),
          });
        }
      }

      if (value.statuses) {
        for (const st of value.statuses) {
          const statusMap: Record<string, string> = {
            sent: "sent",
            delivered: "delivered",
            read: "read",
            failed: "failed",
          };
          const status = statusMap[st.status] ?? st.status;
          await c.env.DB.prepare(
            "UPDATE messages SET status = ? WHERE meta_message_id = ?"
          )
            .bind(status, st.id)
            .run();
          const doId = c.env.INBOX.idFromName(wabaNumberId);
          const stub = c.env.INBOX.get(doId);
          await stub.fetch("http://do/broadcast", {
            method: "POST",
            body: JSON.stringify({
              type: "message_status",
              payload: { messageId: st.id, status },
            }),
          });
        }
      }
    }
  }

  return c.json({ ok: true });
});

app.get("/api/ws/:wabaNumberId", async (c) => {
  const wabaNumberId = c.req.param("wabaNumberId");
  const doId = c.env.INBOX.idFromName(wabaNumberId);
  const stub = c.env.INBOX.get(doId);
  const doRequest = new Request("http://do/connect", {
    method: "GET",
    headers: c.req.raw.headers,
  });
  return stub.fetch(doRequest);
});

async function getClerkOrgIdAndSub(
  token: string,
  _secretKey: string
): Promise<{ orgId: string | null; sub: string } | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
      new TextDecoder().decode(
        new Uint8Array(
          Array.from(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")), (c) =>
            c.charCodeAt(0)
          )
        )
      )
    ) as { iss?: string; sub?: string; org_id?: string };
    const iss = payload.iss;
    const sub = payload.sub;
    if (!iss || !sub) return null;

    const jwksUrl = iss.endsWith("/")
      ? `${iss}.well-known/jwks.json`
      : `${iss}/.well-known/jwks.json`;
    const JWKS = jose.createRemoteJWKSet(new URL(jwksUrl));
    const { payload: verified } = await jose.jwtVerify(token, JWKS, {
      issuer: iss,
    });
    const orgId = (verified as { org_id?: string }).org_id ?? null;
    const subId = (verified as { sub: string }).sub;
    return { orgId, sub: subId };
  } catch {
    return null;
  }
}

async function createClerkOrg(
  secretKey: string,
  createdByUserId: string
): Promise<string | null> {
  const res = await fetch("https://api.clerk.com/v1/organizations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "My Workspace",
      created_by: createdByUserId,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    console.error("Clerk create org failed", res.status, t);
    return null;
  }
  const data = (await res.json()) as { id?: string };
  return data.id ?? null;
}

async function patchClerkOrgMetadata(
  secretKey: string,
  orgId: string,
  metadata: Record<string, unknown>
): Promise<boolean> {
  const res = await fetch(
    `https://api.clerk.com/v1/organizations/${orgId}/metadata`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ public_metadata: metadata }),
    }
  );
  if (!res.ok) {
    const t = await res.text();
    console.error("Clerk patch metadata failed", res.status, t);
    return false;
  }
  return true;
}

app.post("/api/onboarding/complete", async (c) => {
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;
  if (!token || !c.env.CLERK_SECRET_KEY) {
    return c.json({ error: "unauthorized" }, 401);
  }

  const clerk = await getClerkOrgIdAndSub(token, c.env.CLERK_SECRET_KEY);
  if (!clerk) {
    return c.json({ error: "invalid_token" }, 401);
  }

  let orgId = clerk.orgId;
  if (!orgId) {
    orgId = await createClerkOrg(c.env.CLERK_SECRET_KEY, clerk.sub);
    if (!orgId) {
      return c.json({ error: "org_creation_failed" }, 500);
    }
  }

  let body: Record<string, unknown>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_body" }, 400);
  }

  const industry = (body.industry as string) ?? "";
  const goal = (body.goal as string) ?? "";
  const teamSize = (body.teamSize as string) ?? "";
  const tool = (body.tool as string) ?? "";
  const switcherTool = (body.switcherTool as string) ?? null;
  const ownerPhone = (body.ownerPhone as string) ?? null;

  const trialStartDate = new Date().toISOString();

  try {
    await c.env.DB.prepare(
      `INSERT INTO organizations (id, industry, goal, team_size, tool, switcher_tool, owner_phone, trial_start_date, plan)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'trial')`
    )
      .bind(
        orgId,
        industry,
        goal,
        teamSize,
        tool,
        switcherTool,
        ownerPhone,
        trialStartDate
      )
      .run();
  } catch (e) {
    console.error("Failed to insert organization", e);
    return c.json({ error: "db_error" }, 500);
  }

  const ok = await patchClerkOrgMetadata(c.env.CLERK_SECRET_KEY, orgId, {
    onboardedAt: trialStartDate,
    trialStartDate,
    industry: industry ?? undefined,
    goal: goal ?? undefined,
    teamSize: teamSize ?? undefined,
    tool: tool ?? undefined,
    plan: "trial",
  });
  if (!ok) {
    return c.json(
      { error: "metadata_update_failed", orgId, trialStartDate },
      500
    );
  }

  return c.json({ status: "ok", orgId, trialStartDate });
});

export { InboxConnection } from "./durable-objects/InboxConnection";
export default app;
