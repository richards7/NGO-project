/**
 * Database adapter factory.
 *
 * Depending on the DB_MODE environment variable:
 *  - "postgres" (default) → PrismaAdapter wrapping PrismaClient
 *  - "sqlite"             → SqliteAdapter using better-sqlite3
 *
 * Services import `getDb()` instead of a raw Prisma client.
 * This lets the same Express code run against either database engine.
 */
import type { IDbAdapter } from "../adapters/db-adapter";

let _db: IDbAdapter | null = null;

/**
 * Get the database adapter singleton.
 * Must call `initDb()` first (done in server.ts / camp-server.ts).
 */
export function getDb(): IDbAdapter {
  if (!_db) {
    throw new Error(
      "Database not initialized. Call initDb() before using getDb()."
    );
  }
  return _db;
}

/**
 * Initialize the database adapter.
 * @param mode - "postgres" for cloud mode, "sqlite" for local camp mode
 * @param sqlitePath - optional path to the SQLite database file
 */
export async function initDb(
  mode: "postgres" | "sqlite" = "postgres",
  sqlitePath?: string
): Promise<IDbAdapter> {
  if (_db) return _db;

  if (mode === "sqlite") {
    const { SqliteAdapter } = await import("../adapters/sqlite-adapter");
    _db = new SqliteAdapter(sqlitePath);
  } else {
    const { PrismaAdapter } = await import("../adapters/prisma-adapter");
    _db = new PrismaAdapter();
  }

  await _db.$connect();
  return _db;
}

// ── Backward compatibility ─────────────────────────────────────────────
// Some files may still `import prisma from "../config/database"`.
// This default export provides a lazy proxy so those imports don't break
// during the migration. New code should use `getDb()` instead.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
});

export default prisma;
