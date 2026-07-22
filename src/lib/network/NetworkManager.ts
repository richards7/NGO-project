export type ConnectionState = "CLOUD" | "CAMP" | "OFFLINE";

export class NetworkManager {
  private state: ConnectionState = "CLOUD";
  private cloudUrl: string;
  private campUrl: string;
  private listeners: Set<(state: ConnectionState) => void> = new Set();
  private pingInterval: any = null;

  constructor(cloudUrl: string, campUrl?: string) {
    this.cloudUrl = cloudUrl;
    
    if (campUrl) {
      this.campUrl = campUrl;
    } else {
      const hostname = typeof window !== "undefined" ? window.location.hostname : "localhost";
      this.campUrl = `http://${hostname}:5000/api/v1`;
    }
    
    // Initial check
    this.checkConnection();

    // Listen to browser online/offline events (only on client)
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => this.checkConnection());
      window.addEventListener("offline", () => this.checkConnection());
    }

    // Periodically check connection every 10 seconds (only on client)
    if (typeof window !== "undefined") {
      this.pingInterval = setInterval(() => this.checkConnection(), 10000);
    }
  }

  public getState(): ConnectionState {
    return this.state;
  }

  public getApiUrl(): string {
    if (this.state === "CAMP") return this.campUrl;
    return this.cloudUrl;
  }

  public subscribe(listener: (state: ConnectionState) => void) {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l(this.state));
  }

  public async forceCheck() {
    await this.checkConnection();
  }

  private async pingUrl(url: string, timeoutMs: number): Promise<boolean> {
    try {
      const res = await fetch(url, { method: "GET", cache: "no-store", signal: AbortSignal.timeout(timeoutMs) });
      return res.ok;
    } catch {
      return false;
    }
  }

  private async checkConnection() {
    // In an offline hotspot, navigator.onLine might be false because there is no external internet.
    // However, we still want to check if the local Camp Server is reachable!
    const isBrowserOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

    if (isBrowserOnline) {
      try {
        // Check Cloud first
        const cloudRes = await fetch(`${this.cloudUrl}/health`, { method: "GET", cache: "no-store", signal: AbortSignal.timeout(3000) });
        if (cloudRes.ok) {
          this.updateState("CLOUD");
          return;
        }
      } catch (e) {
        // Cloud is unreachable
      }
    }

    // Try Camp Server with multiple possible URLs and a generous timeout
    // Build a list of candidate camp URLs to try
    const campUrls = new Set<string>();
    campUrls.add(this.campUrl);

    // Also try common local addresses in case the hostname-derived URL doesn't work
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      campUrls.add(`http://${hostname}:5000/api/v1`);
      campUrls.add(`http://localhost:5000/api/v1`);
      campUrls.add(`http://127.0.0.1:5000/api/v1`);
    }

    // Try all camp URLs concurrently — first one to succeed wins
    const campChecks = Array.from(campUrls).map((url) => this.pingUrl(`${url}/health`, 5000));
    const results = await Promise.all(campChecks);

    if (results.some((ok) => ok)) {
      // Update campUrl to the one that succeeded so API calls use it
      const successIndex = results.findIndex((ok) => ok);
      this.campUrl = Array.from(campUrls)[successIndex];
      this.updateState("CAMP");
      return;
    }

    this.updateState("OFFLINE");
  }

  private updateState(newState: ConnectionState) {
    if (this.state !== newState) {
      console.log(`[NetworkManager] State changed: ${this.state} -> ${newState}`);
      this.state = newState;
      this.notify();
    }
  }

  public destroy() {
    clearInterval(this.pingInterval);
  }
}

// Global instance (cloudUrl defaults to Vite env, camp defaults to localhost:5000)
export const networkManager = new NetworkManager(
  import.meta.env.VITE_API_URL || "http://localhost:5001/api/v1"
);
