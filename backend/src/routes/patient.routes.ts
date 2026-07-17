import { Router } from "express";
import { PatientController } from "../controllers/patient.controller";
import { authenticate, authorize } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { createPatientSchema, captureVitalsSchema, createFamilySchema } from "../dtos/patient.dto";
import { auditLog } from "../middlewares/audit";

const router = Router();
const ctrl = new PatientController();

router.use(authenticate);

// Patients
router.post("/", authorize("admin", "registration"), validate(createPatientSchema), auditLog("REGISTER_PATIENT"), ctrl.create.bind(ctrl));
router.get("/", authorize("admin", "registration", "doctor", "medical_assistant"), ctrl.findAll.bind(ctrl));
router.get("/export/csv", ctrl.exportCSV.bind(ctrl));
router.get("/queue", authorize("admin", "medical_assistant", "doctor", "registration"), ctrl.getQueue.bind(ctrl));
router.get("/pharmacy-queue", authorize("admin", "pharmacy"), ctrl.getPharmacyQueue.bind(ctrl));
router.get("/:id", ctrl.findById.bind(ctrl));
router.patch("/:id", authorize("admin", "registration", "doctor"), ctrl.update.bind(ctrl));
router.get("/:id/history", ctrl.getHistory.bind(ctrl));

// Vitals
router.post("/vitals", authorize("admin", "medical_assistant", "registration"), validate(captureVitalsSchema), auditLog("CAPTURE_VITALS"), ctrl.captureVitals.bind(ctrl));
router.put("/:id/vitals", authorize("admin", "medical_assistant", "registration"), validate(captureVitalsSchema), auditLog("UPDATE_VITALS"), ctrl.updateVitals.bind(ctrl));

// Families
router.post("/families", authorize("admin", "registration"), validate(createFamilySchema), ctrl.createFamily.bind(ctrl));
router.get("/families/search", ctrl.searchFamilies.bind(ctrl));
router.get("/families/:id", ctrl.findFamilyById.bind(ctrl));

export default router;

