import { openDB, DBSchema, IDBPDatabase } from "idb";

interface OfflineMutation {
  id: string; // uuid
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: any;
  timestamp: number;
}

interface OfflineCache {
  url: string;
  data: any;
  timestamp: number;
}

interface CampDB extends DBSchema {
  mutations: {
    key: string;
    value: OfflineMutation;
    indexes: { "by-timestamp": number };
  };
  cache: {
    key: string;
    value: OfflineCache;
  };
}

class IndexedDBStorage {
  private dbPromise: Promise<IDBPDatabase<CampDB> | null>;

  constructor() {
    if (typeof window === "undefined") {
      this.dbPromise = Promise.resolve(null);
      return;
    }
    this.dbPromise = openDB<CampDB>("ArogyaCampDB", 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("mutations")) {
          const mutationStore = db.createObjectStore("mutations", {
            keyPath: "id",
          });
          mutationStore.createIndex("by-timestamp", "timestamp");
        }
        if (!db.objectStoreNames.contains("cache")) {
          db.createObjectStore("cache", {
            keyPath: "url",
          });
        }
      },
    });
  }

  // --- Mutations ---

  async saveMutation(mutation: Omit<OfflineMutation, "timestamp">): Promise<void> {
    const db = await this.dbPromise;
    if (!db) return;
    await db.put("mutations", {
      ...mutation,
      timestamp: Date.now(),
    });
  }

  async getPendingMutations(): Promise<OfflineMutation[]> {
    const db = await this.dbPromise;
    if (!db) return [];
    return db.getAllFromIndex("mutations", "by-timestamp");
  }

  async clearMutation(id: string): Promise<void> {
    const db = await this.dbPromise;
    if (!db) return;
    await db.delete("mutations", id);
  }

  async clearAllMutations(): Promise<void> {
    const db = await this.dbPromise;
    if (!db) return;
    await db.clear("mutations");
  }

  // --- Cache ---

  async saveCache(url: string, data: any): Promise<void> {
    const db = await this.dbPromise;
    if (!db) return;
    await db.put("cache", {
      url,
      data,
      timestamp: Date.now(),
    });
  }

  async getCache(url: string): Promise<any | null> {
    const db = await this.dbPromise;
    if (!db) return null;
    const cache = await db.get("cache", url);
    return cache ? cache.data : null;
  }
}

export const dbStorage = new IndexedDBStorage();
