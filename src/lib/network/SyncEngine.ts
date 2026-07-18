import { networkManager } from "./NetworkManager";
import { dbStorage } from "./IndexedDBStorage";
import { apiRequest } from "../api";
import { toast } from "sonner"; // For UI notifications, standard in Lovable stacks

export class SyncEngine {
  private isSyncing = false;

  constructor() {
    networkManager.subscribe(async (state) => {
      if (state !== "OFFLINE" && typeof window !== "undefined") {
        await this.syncMutations();
      }
    });

    // Start a periodic sync every 30 seconds as fallback (only on client)
    if (typeof window !== "undefined") {
      setInterval(() => {
        if (networkManager.getState() !== "OFFLINE") {
          this.syncMutations();
        }
      }, 30000);
    }
  }

  public async syncMutations() {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      const pending = await dbStorage.getPendingMutations();
      if (pending.length === 0) {
        this.isSyncing = false;
        return;
      }

      console.log(`[SyncEngine] Starting sync of ${pending.length} mutations...`);
      
      let successCount = 0;
      let failureCount = 0;

      for (const mutation of pending) {
        try {
          await this.executeMutation(mutation);
          await dbStorage.clearMutation(mutation.id);
          successCount++;
        } catch (error: any) {
          console.error(`[SyncEngine] Failed to sync mutation ${mutation.id}:`, error);
          
          // If it's a 4xx error (except 401/429), it's a client error (e.g. validation).
          // We drop it so we don't get stuck in a retry loop forever.
          if (error.status >= 400 && error.status < 500 && error.status !== 401 && error.status !== 429) {
            console.warn(`[SyncEngine] Dropping invalid mutation ${mutation.id}`);
            await dbStorage.clearMutation(mutation.id);
          } else {
            failureCount++;
          }
        }
      }

      if (successCount > 0) {
        toast.success(`Synced ${successCount} offline changes successfully.`);
      }
      if (failureCount > 0) {
        toast.error(`Failed to sync ${failureCount} changes. Will retry later.`);
      }

    } catch (err) {
      console.error("[SyncEngine] Sync failed:", err);
    } finally {
      this.isSyncing = false;
    }
  }

  private async executeMutation(mutation: any) {
    const apiUrl = networkManager.getApiUrl();
    const headers = { ...mutation.headers };
    
    // Refresh token from localStorage if missing
    if (!headers.Authorization) {
      const token = localStorage.getItem("arogya.token");
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${apiUrl}${mutation.url}`, {
      method: mutation.method,
      headers,
      body: mutation.body ? JSON.stringify(mutation.body) : undefined,
    });

    if (!response.ok) {
      const err: any = new Error("Sync request failed");
      err.status = response.status;
      throw err;
    }
  }
}

export const syncEngine = new SyncEngine();
