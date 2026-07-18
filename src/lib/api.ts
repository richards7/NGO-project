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

  let isOffline = networkManager.getState() === "OFFLINE";

  // Handle offline mutations
  if (isMutation && isOffline) {
    if (endpoint === "/auth/login") {
      throw new Error("Cannot login while offline. Please connect to the network.");
    }
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

  const BASE_URL = networkManager.getApiUrl();

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
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
    if (!isMutation) {
      // Fallback to cache for GET
      const cached = await dbStorage.getCache(endpoint);
      if (cached) {
        toast.warning("Offline: Showing cached data");
        return cached;
      }
    } else if (error.message.includes("Failed to fetch") || error.name === "TypeError") {
      if (endpoint === "/auth/login") {
        throw new Error("Cannot login while offline. Please connect to the network.");
      }
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
