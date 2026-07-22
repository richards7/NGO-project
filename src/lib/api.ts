import { networkManager } from "./network/NetworkManager";
import { dbStorage } from "./network/IndexedDBStorage";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data: T; message?: string }> {
  const token = typeof window !== "undefined" ? localStorage.getItem("arogya.token") : null;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const method = (options.method || "GET").toUpperCase();
  const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
  // Force network check if trying to login to ensure we have the correct server URL
  if (endpoint === "/auth/login") {
    await networkManager.forceCheck();
  }

  const isOffline = networkManager.getState() === "OFFLINE";

  // Handle offline mutations — but NOT login
  // For login, we always attempt the request even if NetworkManager thinks we're offline,
  // because the detection can have false positives (short timeouts, race conditions, etc.)
  if (isMutation && isOffline && endpoint !== "/auth/login") {
    await dbStorage.saveMutation({
      id: uuidv4(),
      url: endpoint,
      method,
      headers: headers as Record<string, string>,
      body: options.body ? JSON.parse(options.body as string) : undefined,
    });
    toast.info("Offline mode: Action saved and will sync later.");
    return { success: true, data: {} as T, message: "Queued offline" };
  }

  // For login when offline, try all known server URLs before giving up
  const BASE_URL = networkManager.getApiUrl();

  // Build list of URLs to try for login (fallback strategy)
  const urlsToTry: string[] = [BASE_URL];
  if (endpoint === "/auth/login") {
    const hostname = typeof window !== "undefined" ? window.location.hostname : "localhost";
    const candidates = [
      `http://${hostname}:5000/api/v1`,
      `http://localhost:5000/api/v1`,
      `http://127.0.0.1:5000/api/v1`,
      `http://localhost:5001/api/v1`,
    ];
    for (const c of candidates) {
      if (!urlsToTry.includes(c)) urlsToTry.push(c);
    }
  }

  let lastError: any = null;

  for (const tryUrl of endpoint === "/auth/login" ? urlsToTry : [BASE_URL]) {
    try {
      const response = await fetch(`${tryUrl}${endpoint}`, {
        ...options,
        headers,
        signal: AbortSignal.timeout(10000),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        // If 5xx error, we might want to fallback to cache for GET
        if (!isMutation && response.status >= 500) {
          throw new Error("Server error, falling back to cache");
        }
        throw new Error(body.message || `API request failed with status ${response.status}`);
      }

      // Cache successful GET requests
      if (!isMutation) {
        await dbStorage.saveCache(endpoint, body);
      }

      return body;
    } catch (error: any) {
      lastError = error;

      // If this is a login attempt and we have more URLs to try, continue
      if (endpoint === "/auth/login" && (error.message.includes("Failed to fetch") || error.name === "TypeError" || error.name === "AbortError")) {
        continue;
      }

      if (!isMutation) {
        // Fallback to cache for GET
        const cached = await dbStorage.getCache(endpoint);
        if (cached) {
          toast.warning("Offline: Showing cached data");
          return cached;
        }
      } else if (error.message.includes("Failed to fetch") || error.name === "TypeError") {
        // Network error during mutation, queue it
        await dbStorage.saveMutation({
          id: uuidv4(),
          url: endpoint,
          method,
          headers: headers as Record<string, string>,
          body: options.body ? JSON.parse(options.body as string) : undefined,
        });
        toast.info("Network error: Action saved and will sync later.");
        return { success: true, data: {} as T, message: "Queued offline" };
      }

      throw error;
    }
  }

  // If all login URLs failed
  if (endpoint === "/auth/login") {
    throw new Error("Cannot login while offline. Please connect to the network.");
  }

  throw lastError;
}
