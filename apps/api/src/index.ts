import { createApp } from "./app";
import { loadConfig } from "./config";
import { connect } from "./deps";

let config;
try {
  config = loadConfig(process.env);
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}

const deps = connect(config);
const server = Bun.serve({ port: config.PORT, fetch: createApp(deps.checks).fetch });
console.log(`api listening on ${server.url.href}`);

async function shutdown(signal: string) {
  console.log(`${signal} received, draining`);
  await server.stop(); // stops accepting, waits for in-flight requests
  await deps.close();
  process.exit(0);
}
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
