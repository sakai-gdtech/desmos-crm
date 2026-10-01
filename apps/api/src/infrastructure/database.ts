import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql, type SQL } from "drizzle-orm";
import { config } from "../shared/config.js";
import * as schema from "./schema.js";
export const pool = new pg.Pool({
  connectionString: config.DATABASE_URL,
  max: 12,
  connectionTimeoutMillis: 5000,
});
export const db = drizzle(pool, { schema });
export type Executor = Pick<typeof db, "execute">;
export type Row = Record<string, any>;
export async function rows<T extends Row = Row>(
  executor: Executor,
  query: SQL,
): Promise<T[]> {
  return (await executor.execute(query)).rows as T[];
}
export async function one<T extends Row = Row>(
  executor: Executor,
  query: SQL,
): Promise<T | undefined> {
  return (await rows<T>(executor, query))[0];
}
export function camel(row: Row): Row {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()),
      value,
    ]),
  );
}
export async function audit(
  executor: Executor,
  context: { tenantId: string; userId: string; requestId?: string },
  action: string,
  subjectId: string,
  before: unknown = null,
  after: unknown = null,
) {
  await executor.execute(
    sql`INSERT INTO audit_logs(tenant_id,actor_id,action,subject_id,before,after,request_id) VALUES (${context.tenantId},${context.userId},${action},${subjectId},${JSON.stringify(before)}::jsonb,${JSON.stringify(after)}::jsonb,${context.requestId ?? null})`,
  );
}
