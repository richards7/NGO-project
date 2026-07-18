import { Router } from "express";
import { SyncController, PredictionController } from "../controllers/sync.controller";
import { authenticate, authorize } from "../middlewares/auth";

const router = Router();
const syncCtrl = new SyncController();
const predCtrl = new PredictionController();

router.use(authenticate);

// PowerSync endpoints
router.post("/sync/powersync-push", syncCtrl.push.bind(syncCtrl));

// Legacy pull/push endpoints
router.get("/sync/pull", syncCtrl.pull.bind(syncCtrl));
router.post("/sync/push", syncCtrl.push.bind(syncCtrl));

// Demand prediction (Admin only)
router.post("/predict", authorize("admin"), predCtrl.predict.bind(predCtrl));

import { cloudSyncService } from "../services/cloud-sync.service";
import { getDb } from "../config/database";
import { SqliteAdapter } from "../adapters/sqlite-adapter";

// Local Camp Sync Endpoints (Server-to-Server Sync)
router.get("/local-status", (req, res) => {
  const db = getDb();
  if (db.mode !== "sqlite") {
    return res.status(400).json({ message: "Not in local camp mode" });
  }
  const sqlite = db as SqliteAdapter;
  const raw = sqlite.getRawDb();
  
  try {
    let state = raw.prepare(`SELECT last_pull_at FROM _sync_state WHERE id = 'main'`).get() as any;
    // We would also sum up pending rows from all tables here in a real implementation
    return res.status(200).json({ lastSync: state?.last_pull_at, mode: "local" });
  } catch (err) {
    return res.status(500).json({ error: "State not initialized" });
  }
});

router.post("/force", async (req, res) => {
  try {
    // Fire and forget
    cloudSyncService.syncAll();
    return res.status(202).json({ message: "Sync triggered" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// SSE for real-time status
router.get("/events", (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); // flush the headers to establish SSE

  const onStart = () => res.write(`data: ${JSON.stringify({ type: 'sync-started' })}\n\n`);
  const onProgress = (data: any) => res.write(`data: ${JSON.stringify({ type: 'sync-progress', ...data })}\n\n`);
  const onComplete = (data: any) => res.write(`data: ${JSON.stringify({ type: 'sync-complete', ...data })}\n\n`);
  const onFailed = (err: any) => res.write(`data: ${JSON.stringify({ type: 'sync-failed', error: err.message })}\n\n`);

  cloudSyncService.on('sync-started', onStart);
  cloudSyncService.on('sync-progress', onProgress);
  cloudSyncService.on('sync-complete', onComplete);
  cloudSyncService.on('sync-failed', onFailed);

  req.on('close', () => {
    cloudSyncService.off('sync-started', onStart);
    cloudSyncService.off('sync-progress', onProgress);
    cloudSyncService.off('sync-complete', onComplete);
    cloudSyncService.off('sync-failed', onFailed);
  });
});

export default router;
