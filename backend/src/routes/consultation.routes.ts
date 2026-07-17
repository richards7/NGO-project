import { Router } from "express";
import { ConsultationController } from "../controllers/consultation.controller";
import { authenticate, authorize } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import {
  createPrescriptionSchema,
  createDoctorNoteSchema,
  createFollowUpSchema,
} from "../dtos/camp.dto";

const router = Router();
const ctrl = new ConsultationController();

router.use(authenticate);

router.get("/patient/:id", authorize("doctor", "admin"), ctrl.getPatientForConsultation.bind(ctrl));

router.post("/prescriptions", authorize("doctor", "admin"), validate(createPrescriptionSchema), ctrl.createPrescription.bind(ctrl));
router.put("/prescriptions/:id", authorize("doctor", "admin"), validate(createPrescriptionSchema), ctrl.updatePrescription.bind(ctrl));
router.get("/prescriptions/:id", ctrl.getPrescription.bind(ctrl));
router.get("/prescriptions/:id/pdf", ctrl.downloadPrescriptionPDF.bind(ctrl));
router.post("/prescriptions/:id/email", authorize("doctor", "admin"), ctrl.emailPrescription.bind(ctrl));
router.post("/prescriptions/:id/signature", authorize("doctor"), ctrl.storeSignature.bind(ctrl));

router.post("/notes", authorize("doctor", "admin"), validate(createDoctorNoteSchema), ctrl.createNote.bind(ctrl));

router.post("/followups", authorize("doctor", "admin"), validate(createFollowUpSchema), ctrl.createFollowUp.bind(ctrl));
router.get("/followups/pending", ctrl.getPendingFollowUps.bind(ctrl));
router.patch("/followups/:id/complete", authorize("doctor", "admin"), ctrl.completeFollowUp.bind(ctrl));

export default router;
