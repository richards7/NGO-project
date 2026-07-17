/**
 * PowerSync database singleton.
 *
 * Creates a single PowerSyncDatabase backed by SQLite via WebAssembly + OPFS.
 * The database file `arogya-camp.db` persists in the browser's
 * Origin Private File System across page reloads — even without internet.
 */
import { PowerSyncDatabase } from "@powersync/web";
import { AppSchema } from "./schema";

let _db: PowerSyncDatabase | null = null;

/**
 * Get (or lazily create) the PowerSync database singleton.
 */
export function getDb(): PowerSyncDatabase {
  if (!_db) {
    _db = new PowerSyncDatabase({
      schema: AppSchema,
      database: { dbFilename: "arogya-camp.db" },
    });
  }
  return _db;
}

export { _db as db };
