import { z } from "zod";

export const ReadyResponse = z.object({
  status: z.enum(["ready", "not_ready"]),
  checks: z.record(z.string(), z.enum(["up", "down"])),
});
export type ReadyResponse = z.infer<typeof ReadyResponse>;
