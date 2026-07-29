import { Router } from "express";
import { ExportController } from "../controllers/export.controller";
import { authenticate, authorize } from "../middlewares/auth";

const router = Router();
const ctrl = new ExportController();

router.get("/:campId", authenticate, authorize("admin"), ctrl.exportCampData.bind(ctrl));

export default router;
