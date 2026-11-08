import { z } from "zod";

const Config = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  REDIS_URL: z.url({ protocol: /^rediss?$/ }),
});
export type Config = z.infer<typeof Config>;

// Throws with every invalid key listed, so startup fails fast with a readable message.
export function loadConfig(env: Record<string, string | undefined>): Config {
  const result = Config.safeParse(env);
  if (!result.success) {
    throw new Error(`Invalid configuration:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
