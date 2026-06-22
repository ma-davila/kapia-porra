import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type DB = ReturnType<typeof drizzle<typeof schema>>;

let _db: DB | null = null;
// Test hook: lets a local verification script inject an embedded Postgres
// (PGlite) instance. Never set in production.
let _override: DB | null = null;
export function setDbForTesting(db: DB) {
  _override = db;
}

// Lazily create the connection so importing this module never throws when
// DATABASE_URL is missing (e.g. during `next build`).
export function getDb(): DB {
  if (_override) return _override;
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  // prepare:false is required for Neon's pooled (pgbouncer) connection.
  const client = postgres(url, { prepare: false });
  _db = drizzle(client, { schema });
  return _db;
}

export { schema };
