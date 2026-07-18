import { logger } from "../utils/logger";
import EventEmitter from "events";
import { cloudSyncService } from "./cloud-sync.service";

class ConnectivityWatcher extends EventEmitter {
  private isOnline = false;
  private interval: NodeJS.Timeout | null = null;
  private cloudUrl: string;

  constructor() {
    super();
    this.cloudUrl = process.env.CLOUD_API_URL || "http://localhost:5001/api/v1";
  }

  public start(pingIntervalMs = 30000) {
    if (this.interval) return;
    logger.info(`[ConnectivityWatcher] Starting cloud connectivity check every ${pingIntervalMs}ms`);
    
    // Initial check
    this.check();

    this.interval = setInterval(() => this.check(), pingIntervalMs);
  }

  public stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private async check() {
    try {
      // Fast timeout for health check
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(`${this.cloudUrl}/health`, {
        signal: controller.signal
      });
      
      clearTimeout(timeout);

      if (response.ok && !this.isOnline) {
        this.isOnline = true;
        logger.info("[ConnectivityWatcher] Cloud is ONLINE. Triggering sync...");
        this.emit("online");
        // Trigger background sync
        cloudSyncService.syncAll().catch(err => {
          logger.error("[ConnectivityWatcher] Sync failed after coming online:", err);
        });
      } else if (!response.ok && this.isOnline) {
        this.isOnline = false;
        logger.warn(`[ConnectivityWatcher] Cloud is OFFLINE (status: ${response.status})`);
        this.emit("offline");
      }
    } catch (error) {
      if (this.isOnline) {
        this.isOnline = false;
        logger.warn("[ConnectivityWatcher] Cloud is OFFLINE (network error)");
        this.emit("offline");
      }
    }
  }

  public getStatus() {
    return this.isOnline;
  }
}

export const connectivityWatcher = new ConnectivityWatcher();
