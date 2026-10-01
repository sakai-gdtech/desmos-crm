import { buildApp } from "./app.js";
import { config } from "./shared/config.js";
import { pool } from "./infrastructure/database.js";
const app = await buildApp();
await app.listen({ port: config.API_PORT, host: "0.0.0.0" });
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, async () => {
    await app.close();
    await pool.end();
    process.exit(0);
  });
