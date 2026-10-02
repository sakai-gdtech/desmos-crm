import { buildApp } from "./app.js";
import { config } from "./shared/config.js";
import { pool } from "./infrastructure/database.js";
import { startCommercialScheduler } from "./infrastructure/commercial-scheduler.js";
const app = await buildApp();
const stopCommercial = startCommercialScheduler((error) =>
  app.log.error({ err: error }, "Falha no processamento de avisos internos."),
);
await app.listen({ port: config.API_PORT, host: "0.0.0.0" });
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, async () => {
    stopCommercial();
    await app.close();
    await pool.end();
    process.exit(0);
  });
