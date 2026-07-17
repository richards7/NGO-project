import { Router } from "express";
import { PharmacyController } from "../controllers/pharmacy.controller";
import { authenticate, authorize } from "../middlewares/auth";

const router = Router();
const ctrl = new PharmacyController();

router.use(authenticate);

router.get("/queue", authorize("pharmacy", "admin"), ctrl.getPharmacyQueue.bind(ctrl));
router.post("/dispense", authorize("pharmacy", "admin"), ctrl.dispense.bind(ctrl));
router.post("/feedback", authorize("pharmacy", "admin"), ctrl.submitFeedback.bind(ctrl));
router.post("/stock", authorize("admin", "pharmacy"), ctrl.addStock.bind(ctrl));

router.get("/medicines", ctrl.getMedicines.bind(ctrl));
router.get("/medicines/low-stock", authorize("admin", "pharmacy"), ctrl.getLowStockAlerts.bind(ctrl));
router.get("/medicines/expiring", authorize("admin", "pharmacy"), ctrl.getExpiringMedicines.bind(ctrl));

router.get("/transactions", authorize("admin", "pharmacy"), ctrl.getTransactionHistory.bind(ctrl));
router.get("/inventory/:campId", ctrl.getCampInventory.bind(ctrl));

export default router;
