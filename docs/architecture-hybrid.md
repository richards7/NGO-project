# HealthConnect — Hybrid Offline Smart Camp Architecture

## Overview

The HealthConnect Camp OS operates in a three-tier network model to support medical camps in rural areas with little to no internet connectivity.

### The Three Modes

1. **CLOUD MODE (Internet Available)**
   - **Frontend**: Connects directly to `https://api.healthconnect.com`.
   - **Backend**: Express + Prisma + PostgreSQL.
   - **Sync**: Real-time CRUD operations directly to the cloud.

2. **CAMP MODE (Hotspot, No Internet)**
   - **Frontend**: Connects to the local server via `http://<camp-server-ip>:5001`.
   - **Backend**: Express + `better-sqlite3` (running on a local volunteer laptop).
   - **Sync**: All requests are processed normally against the local `camp_data.db`.

3. **OFFLINE MODE (Browser Only)**
   - **Frontend**: Completely disconnected from any server.
   - **Storage**: Caches `GET` requests using Service Workers. Queues `POST/PUT/DELETE` mutations in `IndexedDB`.
   - **Sync**: Replays mutations to the active server (Cloud or Camp) when connectivity returns.

## Core Components

### 1. Database Adapter Layer
Located in `backend/src/adapters/`, this layer decouples the application services from PostgreSQL.
- `IDbAdapter`: The unified interface for database operations.
- `PrismaAdapter`: Used in Cloud mode.
- `SqliteAdapter`: Used in Camp mode, maintaining local metadata (`_version`, `_synced`, `_deleted`).

### 2. Network Manager
Located in `src/lib/network/NetworkManager.ts`.
- Automatically probes for the cloud server (`/health`).
- If unreachable, falls back to the local camp server.
- Intercepts all `apiRequest` calls and routes them appropriately.
- Triggers offline mode if both servers are unreachable.

### 3. Server-to-Server Sync
Located in `backend/src/services/cloud-sync.service.ts` and `backend/src/services/conflict-resolver.ts`.
- When the local camp server detects an internet connection, it triggers the `CloudSyncService`.
- **Push Phase**: Queries all records with `_synced = 0` and sends them to `/api/v1/sync-cloud/ingest`.
- **Pull Phase**: Queries `/api/v1/sync-cloud/pull` for updates since the last sync.
- **Conflict Resolution**: Uses Last-Write-Wins (LWW) resolution based on the `updatedAt` watermark on the cloud server.

### 4. Security
Located in `backend/src/services/encryption.service.ts`.
- Patient PII in the local SQLite database is encrypted at rest using `aes-256-gcm`.
- JWTs have a grace period of 24 hours in local camp mode, allowing offline devices to continue working even if their token technically expires mid-camp.

## Operation

- To start the Cloud backend: `npm run dev`
- To start the Local Camp server: `npm run camp`
- To force a sync from Camp to Cloud: `POST /api/v1/sync/force` on the Camp server.
