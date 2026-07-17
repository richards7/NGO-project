/**
 * PowerSyncProvider — wraps the app to provide the PowerSync database context.
 *
 * Handles:
 *  - Initializing the local SQLite database
 *  - Connecting to the PowerSync Service (when online)
 *  - Exposing sync status (connected, uploading, downloading, offline)
 */
import {
  PowerSyncContext,
} from "@powersync/react";
import {
  type SyncStatus,
} from "@powersync/web";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getDb } from "./db";
import { ArogyaBackendConnector } from "./connector";

// ── Sync status context ────────────────────────────────────────────────

interface SyncState {
  /** true when the PowerSync database has been initialised */
  ready: boolean;
  /** true when connected to the PowerSync service and syncing */
  connected: boolean;
  /** Number of pending local mutations waiting to be uploaded */
  pendingMutations: number;
  /** true while data is being uploaded to the server */
  uploading: boolean;
  /** true while data is being downloaded from the server */
  downloading: boolean;
  /** Trigger a manual re-connect / sync attempt */
  triggerSync: () => void;
}

const SyncStatusContext = createContext<SyncState>({
  ready: false,
  connected: false,
  pendingMutations: 0,
  uploading: false,
  downloading: false,
  triggerSync: () => {},
});

export function useSyncStatus() {
  return useContext(SyncStatusContext);
}

// ── Provider component ─────────────────────────────────────────────────

export function PowerSyncProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [connected, setConnected] = useState(false);
  const [pendingMutations, setPendingMutations] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const db = getDb();

  // Initialise and connect
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        // Initialise the local database (creates tables from the schema)
        await db.init();

        if (cancelled) return;
        setReady(true);

        // Only connect if we have an auth token
        const token = localStorage.getItem("arogya.token");
        if (token) {
          const connector = new ArogyaBackendConnector();
          await db.connect(connector);
        }
      } catch (err) {
        console.error("[PowerSync] Initialisation error:", err);
        // Even if connection fails, local reads still work
        if (!cancelled) setReady(true);
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [db]);

  // Watch sync status changes
  useEffect(() => {
    if (!ready) return;

    const listener = db.registerListener({
      statusChanged: (status: SyncStatus) => {
        setConnected(status.connected);
        setUploading(status.dataFlowStatus?.uploading ?? false);
        setDownloading(status.dataFlowStatus?.downloading ?? false);
      },
    });

    // Poll pending mutations count every 2 seconds
    const interval = setInterval(async () => {
      try {
        const tx = await db.getNextCrudTransaction();
        if (tx) {
          // Count all pending — rough heuristic based on crud length
          setPendingMutations(tx.crud.length);
        } else {
          setPendingMutations(0);
        }
      } catch {
        // Ignore errors in polling
      }
    }, 2000);

    return () => {
      listener?.();
      clearInterval(interval);
    };
  }, [db, ready]);

  const triggerSync = useCallback(async () => {
    try {
      const token = localStorage.getItem("arogya.token");
      if (!token) return;

      if (!db.connected) {
        const connector = new ArogyaBackendConnector();
        await db.connect(connector);
      }
    } catch (err) {
      console.error("[PowerSync] Manual sync failed:", err);
    }
  }, [db]);

  const syncState: SyncState = {
    ready,
    connected,
    pendingMutations,
    uploading,
    downloading,
    triggerSync,
  };

  return (
    <PowerSyncContext.Provider value={db}>
      <SyncStatusContext.Provider value={syncState}>
        {children}
      </SyncStatusContext.Provider>
    </PowerSyncContext.Provider>
  );
}
