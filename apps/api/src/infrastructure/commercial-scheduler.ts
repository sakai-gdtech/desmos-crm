import { sql } from "drizzle-orm";
import { db, rows } from "./database.js";
import { scanTenant } from "../modules/sales/rules.js";
/** Internal-only notifications; independent of the SMTP/outbox worker. */
export function startCommercialScheduler(onError: (error: unknown) => void) {
  let running = false,
    closed = false;
  const tick = async () => {
    if (running || closed) return;
    running = true;
    try {
      const tenants = await rows(db, sql`SELECT id FROM tenants ORDER BY id`);
      for (const tenant of tenants) {
        if (closed) break;
        try {
          await scanTenant(tenant.id);
        } catch (error) {
          onError(error);
        }
      }
    } catch (error) {
      onError(error);
    } finally {
      running = false;
    }
  };
  const timer = setInterval(() => void tick(), 60000);
  timer.unref();
  void tick();
  return () => {
    closed = true;
    clearInterval(timer);
  };
}
