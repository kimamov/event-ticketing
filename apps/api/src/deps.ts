import { RedisClient, SQL } from "bun";
import type { Config } from "./config";
import type { Check } from "./app";

export function connect(config: Config) {
  const sql = new SQL(config.DATABASE_URL, { connectionTimeout: 2 });
  // No offline queue: while Redis is down, commands fail immediately instead of piling up in memory.
  const redis = new RedisClient(config.REDIS_URL, {
    connectionTimeout: 2000,
    enableOfflineQueue: false,
  });

  const checks: Record<string, Check> = {
    postgres: () => sql`select 1`,
    // The client connects lazily; without the offline queue a ping before connect() would fail spuriously.
    redis: async () => {
      if (!redis.connected) await redis.connect();
      return redis.ping();
    },
  };

  async function close() {
    redis.close();
    await sql.close({ timeout: 5 });
  }

  return { sql, redis, checks, close };
}
