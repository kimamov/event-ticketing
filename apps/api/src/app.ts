import { Hono } from "hono";
import type { ReadyResponse } from "@et/shared";

/** A dependency probe: resolves when healthy, rejects otherwise. */
export type Check = () => Promise<unknown>;

const CHECK_TIMEOUT_MS = 1000;

function withTimeout(check: Check, ms: number): Promise<unknown> {
  let timer: Timer | undefined;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
  });
  return Promise.race([check(), timeout]).finally(() => clearTimeout(timer));
}

export function createApp(checks: Record<string, Check>, checkTimeoutMs = CHECK_TIMEOUT_MS) {
  const app = new Hono();

  // Liveness: the process can serve HTTP. Never touches dependencies, so a DB outage doesn't get us restarted.
  app.get("/health", (c) => c.json({ status: "ok" }));

  // Readiness: safe to route traffic here. Probes run in parallel, each bounded by a timeout.
  app.get("/ready", async (c) => {
    const names = Object.keys(checks);
    const results = await Promise.allSettled(names.map((name) => withTimeout(checks[name]!, checkTimeoutMs)));
    const body: ReadyResponse = { status: "ready", checks: {} };
    results.forEach((r, i) => {
      const name = names[i]!;
      body.checks[name] = r.status === "fulfilled" ? "up" : "down";
      if (r.status === "rejected") {
        body.status = "not_ready";
        console.error(`readiness check "${name}" failed:`, r.reason);
      }
    });
    return c.json(body, body.status === "ready" ? 200 : 503);
  });

  return app;
}
