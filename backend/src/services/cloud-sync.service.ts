import { getDb } from "../config/database";
import { logger } from "../utils/logger";
import EventEmitter from "events";
import { SqliteAdapter } from "../adapters/sqlite-adapter";

export class CloudSyncService extends EventEmitter {
  private isSyncing = false;
  private cloudUrl: string;

  // The order in which tables should be synced to respect foreign keys
  // Dependencies first.
  private SYNC_ORDER = [
    "role",
    "permission",
    "user",
    "camp",
    "medicineCategory",
    "medicine",
    "family",
    "healthCard",
    "patient",
    "vitals",
    "disease",
    "allergy",
    "inventory",
    "medicineTransaction",
    "prescription",
    "prescriptionMedicine",
    "doctorNote",
    "followUp",
    "feedback",
    "auditLog",
    "report",
    "notification"
  ];

  constructor() {
    super();
    this.cloudUrl = process.env.CLOUD_API_URL || "http://localhost:5001/api/v1";
  }

  public async syncAll() {
    if (this.isSyncing) return;
    this.isSyncing = true;
    this.emit("sync-started");
    logger.info("[CloudSyncService] Starting full sync cycle...");

    try {
      // Phase 1: Push local changes to cloud
      await this.pushToCloud();

      // Phase 2: Pull cloud changes to local
      await this.pullFromCloud();

      logger.info("[CloudSyncService] Sync cycle completed successfully.");
      this.emit("sync-complete", { success: true });
    } catch (err) {
      logger.error("[CloudSyncService] Sync cycle failed:", err);
      this.emit("sync-failed", err);
    } finally {
      this.isSyncing = false;
    }
  }

  private async pushToCloud() {
    const db = getDb();
    if (db.mode !== "sqlite") {
      logger.warn("[CloudSyncService] pushToCloud only runs on SQLite adapters (Local Camp Mode). Skipping.");
      return;
    }
    const sqliteAdapter = db as SqliteAdapter;
    const rawDb = sqliteAdapter.getRawDb();

    // Map our sync order models to actual table names
    // Note: We use the adapter models directly to figure out table names.
    // For simplicity, we'll hardcode the table name mapping here or rely on the ingestion endpoint to handle it.
    
    let totalPushed = 0;

    for (const model of this.SYNC_ORDER) {
      const repo = (sqliteAdapter as any)[model];
      if (!repo) continue;
      
      const tableName = (repo as any).modelDef.table;

      // Get all unsynced records for this table
      const unsyncedRows = rawDb.prepare(
        `SELECT * FROM "${tableName}" WHERE "_synced" = 0`
      ).all() as any[];

      if (unsyncedRows.length === 0) continue;

      logger.info(`[CloudSyncService] Pushing ${unsyncedRows.length} records for table ${tableName}`);
      this.emit("sync-progress", { phase: "push", table: tableName, count: unsyncedRows.length });

      // Send to cloud
      try {
        const response = await fetch(`${this.cloudUrl}/sync-cloud/ingest`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.CAMP_SECRET || "offline_camp_secret_123"}`
          },
          body: JSON.stringify({
            table: tableName,
            records: unsyncedRows
          })
        });

        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}));
          throw new Error(`Cloud ingest failed: ${response.status} - ${errBody.message || response.statusText}`);
        }

        const result = await response.json();
        
        // Mark as synced locally
        const ids = unsyncedRows.map(r => r.id);
        const placeholders = ids.map(() => "?").join(",");
        rawDb.prepare(
          `UPDATE "${tableName}" SET "_synced" = 1 WHERE "id" IN (${placeholders})`
        ).run(...ids);

        totalPushed += ids.length;
      } catch (err) {
        logger.error(`[CloudSyncService] Error pushing table ${tableName}:`, err);
        throw err; // Stop sync cycle if a table fails, to maintain referential integrity
      }
    }

    logger.info(`[CloudSyncService] Push complete. Total records pushed: ${totalPushed}`);
  }

  private async pullFromCloud() {
    const db = getDb();
    if (db.mode !== "sqlite") return;
    const sqliteAdapter = db as SqliteAdapter;
    const rawDb = sqliteAdapter.getRawDb();

    // Get last sync timestamp from a tracking table (create if not exists)
    rawDb.prepare(`
      CREATE TABLE IF NOT EXISTS _sync_state (
        id TEXT PRIMARY KEY DEFAULT 'main',
        last_pull_at TEXT
      )
    `).run();

    let state = rawDb.prepare(`SELECT last_pull_at FROM _sync_state WHERE id = 'main'`).get() as any;
    if (!state) {
      rawDb.prepare(`INSERT INTO _sync_state (id, last_pull_at) VALUES ('main', '1970-01-01T00:00:00.000Z')`).run();
      state = { last_pull_at: "1970-01-01T00:00:00.000Z" };
    }

    logger.info(`[CloudSyncService] Pulling changes from cloud since ${state.last_pull_at}`);

    const response = await fetch(`${this.cloudUrl}/sync-cloud/pull?since=${encodeURIComponent(state.last_pull_at)}`, {
      headers: {
        "Authorization": `Bearer ${process.env.CAMP_SECRET || "offline_camp_secret_123"}`
      }
    });

    if (!response.ok) {
      throw new Error(`Cloud pull failed: ${response.status}`);
    }

    const { data, timestamp } = await response.json();
    
    // data is { tableName: [records...], tableName2: [records...] }
    // Upsert into local DB
    rawDb.exec('BEGIN TRANSACTION');
    try {
      let totalPulled = 0;
      
      for (const tableName of Object.keys(data)) {
        const records = data[tableName];
        if (!records.length) continue;
        
        logger.info(`[CloudSyncService] Pulled ${records.length} records for ${tableName}`);
        this.emit("sync-progress", { phase: "pull", table: tableName, count: records.length });

        for (const record of records) {
          // Construct UPSERT statement dynamically based on record keys
          const cols = Object.keys(record);
          const placeholders = cols.map(() => "?").join(",");
          const updateAssign = cols.filter(c => c !== 'id').map(c => `"${c}"=excluded."${c}"`).join(",");

          // Force _synced = 1 for records coming from cloud
          let insertCols = [...cols, "_synced"];
          let insertPh = placeholders + ",1";
          let upsertAssign = updateAssign ? `${updateAssign}, "_synced"=1` : `"_synced"=1`;

          const sql = `
            INSERT INTO "${tableName}" (${insertCols.map(c => `"${c}"`).join(",")})
            VALUES (${insertPh})
            ON CONFLICT(id) DO UPDATE SET ${upsertAssign}
          `;
          
          rawDb.prepare(sql).run(...Object.values(record));
          totalPulled++;
        }
      }

      // Update sync state
      rawDb.prepare(`UPDATE _sync_state SET last_pull_at = ? WHERE id = 'main'`).run(timestamp);
      rawDb.exec('COMMIT');
      logger.info(`[CloudSyncService] Pull complete. Total records pulled: ${totalPulled}. New watermark: ${timestamp}`);
    } catch (err) {
      rawDb.exec('ROLLBACK');
      logger.error("[CloudSyncService] Failed to upsert pulled records:", err);
      throw err;
    }
  }
}

export const cloudSyncService = new CloudSyncService();
