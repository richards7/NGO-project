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

export default router;
