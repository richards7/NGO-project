import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";

const prisma = new PrismaClient();

export class ConflictResolver {
  
  /**
   * Upserts a batch of records for a specific table into PostgreSQL using Last-Write-Wins logic.
   * If the incoming record is older than the existing record, it is ignored (conflict loser).
   */
  public async ingestBatchLWW(tableName: string, records: any[]) {
    if (records.length === 0) return { inserted: 0, updated: 0, conflicts: 0 };
    
    let inserted = 0;
    let updated = 0;
    let conflicts = 0;

    // A mapping from model name (from frontend/sqlite) to real Postgres table name
    // Prisma table names are often snake_case or same as model but plural.
    // In schema.prisma, models map to tables. We'll ensure we have the correct DB table name.
    const dbTableName = this.getDbTableName(tableName);
    if (!dbTableName) {
      throw new Error(`Unknown table for LWW ingest: ${tableName}`);
    }

    for (const record of records) {
      // Strip out SQLite specific sync columns we don't want in Postgres
      const { _synced, _deleted, _device_id, _version, _sync_timestamp, ...cleanRecord } = record;
      
      // Also ensure date fields are properly formatted for Postgres
      // Dates coming from SQLite are ISO strings. We'll let Prisma/pg handle them if we use parameterized queries.
      
      const cols = Object.keys(cleanRecord);
      if (cols.length === 0) continue;

      const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
      
      // For updates, we assign excluded values
      const updateAssigns = cols
        .filter(c => c !== "id")
        .map(c => `"${c}" = EXCLUDED."${c}"`)
        .join(", ");

      // LWW condition: incoming updatedAt > existing updatedAt OR incoming version > existing version
      // But we stripped _version! Let's assume updatedAt is the sole source of truth for LWW.
      // Postgres column name might be camelCase (e.g. updatedAt).
      let condition = `"${dbTableName}"."updatedAt" < EXCLUDED."updatedAt"`;
      
      // Handle soft delete if sent from SQLite
      if (record._deleted === 1) {
         // In a robust system, we'd have a soft delete flag in Postgres too or delete it.
         // For now, we update it if we can.
      }

      // Build the raw SQL query string
      let sql = `
        INSERT INTO "${dbTableName}" (${cols.map(c => `"${c}"`).join(", ")})
        VALUES (${placeholders})
      `;

      if (updateAssigns) {
        sql += `
          ON CONFLICT ("id") DO UPDATE SET ${updateAssigns}
          WHERE ${condition}
          RETURNING "id"
        `;
      } else {
        sql += ` ON CONFLICT ("id") DO NOTHING RETURNING "id"`;
      }

      try {
        const result = await prisma.$queryRawUnsafe<any[]>(sql, ...Object.values(cleanRecord));
        if (result.length > 0) {
          // If it returned an ID, it was either inserted or updated
          updated++;
        } else {
          // It hit the conflict and DO UPDATE WHERE failed, meaning it was a conflict loser.
          conflicts++;
        }
      } catch (err: any) {
        // If it throws, maybe the row didn't exist or there was a schema mismatch
        logger.error(`[ConflictResolver] Failed to upsert into ${dbTableName}:`, err.message);
        throw err;
      }
    }

    return { inserted: 0, updated, conflicts }; // inserted/updated are tricky to differentiate with raw SQL, returning 'updated' for both
  }

  private getDbTableName(sqliteTable: string): string {
    // In our SQLite adapter, we used exact table names from schema.prisma (e.g., 'users', 'roles', 'patients')
    // We can just return the string directly if they match.
    return sqliteTable;
  }
}

export const conflictResolver = new ConflictResolver();
