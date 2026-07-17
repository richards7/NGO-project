import { Router } from "express";
import { AnalyticsController } from "../controllers/analytics.controller";
import { authenticate, authorize } from "../middlewares/auth";

const router = Router();
const ctrl = new AnalyticsController();

router.use(authenticate, authorize("admin", "doctor"));

router.get("/dashboard", ctrl.getDashboard.bind(ctrl));
router.get("/diseases", ctrl.getDiseaseDistribution.bind(ctrl));
router.get("/gender", ctrl.getGenderDistribution.bind(ctrl));
router.get("/age", ctrl.getAgeDistribution.bind(ctrl));
router.get("/medicines/top", ctrl.getMostPrescribed.bind(ctrl));
router.get("/inventory", ctrl.getInventoryStatus.bind(ctrl));
router.get("/camps/patients", ctrl.getPatientsPerCamp.bind(ctrl));
router.get("/doctors/performance", ctrl.getDoctorPerformance.bind(ctrl));
router.get("/feedback", ctrl.getFeedbackAnalytics.bind(ctrl));
router.get("/feedback/all", ctrl.getAllFeedback.bind(ctrl));

export default router;
