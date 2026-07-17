import { Request, Response, NextFunction } from "express";
import { ConsultationService } from "../services/consultation.service";
import { PDFService } from "../services/pdf.service";
import { NotificationService } from "../services/notification.service";
import { sendSuccess } from "../utils/response";
import { AppError } from "../utils/app-error";
import { PatientService } from "../services/patient.service";

const consultationService = new ConsultationService();
const pdfService = new PDFService();
const notificationService = new NotificationService();
const patientService = new PatientService();

export class ConsultationController {
  async getPatientForConsultation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const patient = await patientService.findById(req.params.id);
      // Update status to In Consultation
      await patientService.updateStatus(req.params.id, "In Consultation");
      sendSuccess(res, patient);
    } catch (err) { next(err); }
  }

  async createPrescription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw AppError.unauthorized();
      const prescription = await consultationService.createPrescription(req.body, req.user.userId);
      sendSuccess(res, prescription, "Prescription created", 201);
    } catch (err) { next(err); }
  }

  async updatePrescription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw AppError.unauthorized();
      const prescription = await consultationService.updatePrescription(req.params.id, req.body, req.user.userId);
      sendSuccess(res, prescription, "Prescription updated", 200);
    } catch (err) { next(err); }
  }

  async getPrescription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rx = await consultationService.getPrescription(req.params.id);
      sendSuccess(res, rx);
    } catch (err) { next(err); }
  }

  async downloadPrescriptionPDF(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rx = await consultationService.getPrescription(req.params.id);

      const pdfPath = await pdfService.generatePrescription({
        prescriptionId: rx.id,
        doctorName: rx.doctor.name,
        patientName: rx.patient.name,
        patientAge: rx.patient.age,
        patientGender: rx.patient.gender,
        campName: rx.camp.name,
        campLocation: rx.camp.location,
        date: rx.camp.date.toLocaleDateString("en-IN"),
        advice: rx.advice ?? undefined,
        medicines: rx.medicines.map((m) => ({
          name: m.medicine.name,
          dosage: m.dosage,
          frequency: m.frequency,
          duration: m.duration,
        })),
      });

      res.download(pdfPath, `prescription-${rx.id}.pdf`);
    } catch (err) { next(err); }
  }

  async emailPrescription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      const rx = await consultationService.getPrescription(req.params.id);

      const pdfPath = await pdfService.generatePrescription({
        prescriptionId: rx.id,
        doctorName: rx.doctor.name,
        patientName: rx.patient.name,
        patientAge: rx.patient.age,
        patientGender: rx.patient.gender,
        campName: rx.camp.name,
        campLocation: rx.camp.location,
        date: rx.camp.date.toLocaleDateString("en-IN"),
        advice: rx.advice ?? undefined,
        medicines: rx.medicines.map((m) => ({
          name: m.medicine.name,
          dosage: m.dosage,
          frequency: m.frequency,
          duration: m.duration,
        })),
      });

      await notificationService.sendPrescriptionEmail(email, rx.patient.name, pdfPath);
      sendSuccess(res, null, "Prescription emailed successfully");
    } catch (err) { next(err); }
  }

  async createNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw AppError.unauthorized();
      const note = await consultationService.createDoctorNote(req.body, req.user.userId);
      sendSuccess(res, note, "Note saved", 201);
    } catch (err) { next(err); }
  }

  async createFollowUp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const followUp = await consultationService.createFollowUp(req.body);
      sendSuccess(res, followUp, "Follow-up scheduled", 201);
    } catch (err) { next(err); }
  }

  async getPendingFollowUps(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const followUps = await consultationService.getPendingFollowUps();
      sendSuccess(res, followUps);
    } catch (err) { next(err); }
  }

  async completeFollowUp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const followUp = await consultationService.completeFollowUp(req.params.id);
      sendSuccess(res, followUp, "Follow-up marked complete");
    } catch (err) { next(err); }
  }

  async storeSignature(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { signatureBase64 } = req.body;
      const result = await consultationService.storeSignature(req.params.id, signatureBase64);
      sendSuccess(res, result, "Signature stored");
    } catch (err) { next(err); }
  }
}
