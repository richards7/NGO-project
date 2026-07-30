import { Router } from "express";
import { CampController } from "../controllers/camp.controller";
import { authenticate, authorize } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { createCampSchema, updateCampSchema, createFeedbackSchema } from "../dtos/camp.dto";

const router = Router();
const ctrl = new CampController();

router.use(authenticate);

// Camp CRUD
router.post("/", authorize("admin"), validate(createCampSchema), ctrl.create.bind(ctrl));
router.get("/", ctrl.findAll.bind(ctrl));
router.get("/:id", ctrl.findById.bind(ctrl));
router.patch("/:id", authorize("admin"), validate(updateCampSchema), ctrl.update.bind(ctrl));

// Camp Overview & Excel Sync
router.get("/:id/overview", ctrl.getOverview.bind(ctrl));
router.get("/:id/workbook", ctrl.downloadWorkbook.bind(ctrl));
router.get("/:id/sync-status", ctrl.getSyncStatus.bind(ctrl));
router.post("/:id/sync", ctrl.forceSync.bind(ctrl));
router.get("/:id/export", authorize("admin"), ctrl.exportCamp.bind(ctrl));

// Feedback
router.post("/feedback", validate(createFeedbackSchema), ctrl.createFeedback.bind(ctrl));
router.get("/:id/feedback", ctrl.getFeedback.bind(ctrl));

export default router;
