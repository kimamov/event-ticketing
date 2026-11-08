import { afterAll, describe, expect, test } from "bun:test";
import { ReadyResponse } from "@et/shared";
import { createApp } from "./app";
import { loadConfig } from "./config";
import { connect } from "./deps";

// Integration tests: real Postgres + Redis from docker compose (or CI service containers).
const config = loadConfig(process.env);
const real = connect(config);
const deadRedis = connect({ ...config, REDIS_URL: "redis://127.0.0.1:1" }); // nothing listens on port 1
const deadPostgres = connect({ ...config, DATABASE_URL: "postgres://x:x@127.0.0.1:1/x" });

afterAll(async () => {
  await Promise.all([real.close(), deadRedis.close(), deadPostgres.close()]);
});

async function ready(checks: Parameters<typeof createApp>[0], timeoutMs?: number) {
  const res = await createApp(checks, timeoutMs).request("/ready");
  return { status: res.status, body: ReadyResponse.parse(await res.json()) };
}

describe("GET /health", () => {
  test("200 even when every dependency is down", async () => {
    const res = await createApp(deadRedis.checks).request("/health");
    expect(res.status).toBe(200);
  });
});

describe("GET /ready", () => {
  test("200 when Postgres and Redis respond", async () => {
    expect(await ready(real.checks)).toEqual({
      status: 200,
      body: { status: "ready", checks: { postgres: "up", redis: "up" } },
    });
  });

  test("503 and names Redis when Redis is unreachable", async () => {
    const res = await ready({ postgres: real.checks.postgres!, redis: deadRedis.checks.redis! });
    expect(res.status).toBe(503);
    expect(res.body.checks).toEqual({ postgres: "up", redis: "down" });
  });

  test("503 when Postgres is unreachable", async () => {
    const res = await ready({ postgres: deadPostgres.checks.postgres!, redis: real.checks.redis! });
    expect(res.status).toBe(503);
    expect(res.body.checks.postgres).toBe("down");
  });

  test("a hanging dependency is reported down after the timeout, not awaited forever", async () => {
    const started = performance.now();
    const res = await ready({ hang: () => new Promise(() => {}) }, 50);
    expect(res.status).toBe(503);
    expect(performance.now() - started).toBeLessThan(1000);
  });
});

describe("loadConfig", () => {
  test("rejects a missing DATABASE_URL and a non-redis REDIS_URL, naming both", () => {
    expect(() => loadConfig({ REDIS_URL: "http://x" })).toThrow(/DATABASE_URL[\s\S]*REDIS_URL/);
  });
});
