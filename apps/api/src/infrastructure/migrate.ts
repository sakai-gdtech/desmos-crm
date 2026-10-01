import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { pool } from "./database.js";
export async function migrate() {
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock(71200820)");
    await client.query(
      "CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())",
    );
    const directory = fileURLToPath(
      new URL("../../migrations/", import.meta.url),
    );
    for (const name of (await readdir(directory))
      .filter((name) => name.endsWith(".sql"))
      .sort()) {
      const source = await readFile(`${directory}/${name}`, "utf8");
      const checksum = createHash("sha256").update(source).digest("hex");
      const result = await client.query(
        "SELECT checksum FROM schema_migrations WHERE name=$1",
        [name],
      );
      if (result.rows[0]) {
        if (result.rows[0].checksum !== checksum)
          throw new Error(`Migração alterada: ${name}`);
        continue;
      }
      await client.query("BEGIN");
      try {
        await client.query(source);
        await client.query(
          "INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)",
          [name, checksum],
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
      console.log(`Migração aplicada: ${name}`);
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock(71200820)");
    client.release();
  }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await migrate();
  await pool.end();
}
