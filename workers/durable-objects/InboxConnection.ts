import type {
  DurableObject,
  DurableObjectState,
} from "@cloudflare/workers-types";

const DEDUPE_MAX = 100;

export class InboxConnection implements DurableObject {
  private sessions = new Set<WebSocket>();
  private lastMessageIds = new Set<string>();
  private dedupeQueue: string[] = [];

  constructor(private state: DurableObjectState) {}

  private addDedupe(id: string): boolean {
    if (this.lastMessageIds.has(id)) return true;
    this.lastMessageIds.add(id);
    this.dedupeQueue.push(id);
    if (this.dedupeQueue.length > DEDUPE_MAX) {
      const old = this.dedupeQueue.shift();
      if (old) this.lastMessageIds.delete(old);
    }
    return false;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/connect") {
      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];

      server.accept();
      this.sessions.add(server);

      server.addEventListener("message", (ev) => {
        if (ev.data === "ping") {
          try {
            server.send("pong");
          } catch {
            this.sessions.delete(server);
          }
        }
      });
      server.addEventListener("close", () => {
        this.sessions.delete(server);
      });
      server.addEventListener("error", () => {
        this.sessions.delete(server);
      });

      return new Response(null, {
        status: 101,
        webSocket: client,
      } as ResponseInit & { webSocket: WebSocket });
    }

    if (url.pathname === "/broadcast" && request.method === "POST") {
      let payload: unknown;
      try {
        payload = await request.json();
      } catch {
        payload = null;
      }

      const obj = payload as { type?: string; payload?: { message?: { meta_message_id?: string }; messageId?: string } };
      const metaId = obj?.payload?.message?.meta_message_id ?? obj?.payload?.messageId;
      if (typeof metaId === "string" && this.addDedupe(metaId)) {
        return new Response("ok");
      }

      const message = JSON.stringify(payload ?? {});
      for (const ws of this.sessions) {
        try {
          ws.send(message);
        } catch {
          this.sessions.delete(ws);
        }
      }

      return new Response("ok");
    }

    return new Response("Not found", { status: 404 });
  }
}

