/**
 * PowerSync backend connector.
 *
 * Implements the two methods PowerSync requires:
 *  1. fetchCredentials() — get a JWT + PowerSync endpoint from our Express backend.
 *  2. uploadData()       — push local CRUD mutations to our Express API.
 */
import {
  type AbstractPowerSyncDatabase,
  type PowerSyncBackendConnector,
} from "@powersync/web";

import { networkManager } from "../network/NetworkManager";

function getAuthToken(): string | null {
  return localStorage.getItem("arogya.token");
}

export class ArogyaBackendConnector implements PowerSyncBackendConnector {
  async fetchCredentials() {
    const token = getAuthToken();
    if (!token) {
      throw new Error("Not authenticated — cannot fetch PowerSync credentials");
    }

    const response = await fetch(`${networkManager.getApiUrl()}/auth/powersync-token`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch PowerSync credentials: ${response.status}`);
    }

    const { data } = await response.json();

    return {
      endpoint: data.endpoint,
      token: data.token,
    };
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();
    if (!transaction) return;

    const token = getAuthToken();
    if (!token) {
      throw new Error("Not authenticated — cannot upload data");
    }

    try {
      const response = await fetch(`${networkManager.getApiUrl()}/sync/powersync-push`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ batches: transaction.crud }),
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      await transaction.complete();
    } catch (error: any) {
      console.error("[PowerSync] Upload failed", error);
      throw error;
    }
  }
}
