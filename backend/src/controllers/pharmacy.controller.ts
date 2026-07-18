import { Request, Response, NextFunction } from "express";
import { PharmacyService } from "../services/pharmacy.service";
import { NotificationService } from "../services/notification.service";
import { PatientService } from "../services/patient.service";
import { sendSuccess } from "../utils/response";
import { AppError } from "../utils/app-error";
import { getDb } from "../config/database";

const pharmacyService = new PharmacyService();
const notificationService = new NotificationService();
const patientService = new PatientService();

export class PharmacyController {
  async getPharmacyQueue(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const queue = await patientService.getPharmacyQueue();
      sendSuccess(res, queue, "Pharmacy queue fetched");
    } catch (err) { next(err); }
  }

  async submitFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { patientId, campId, rating, comments } = req.body;
      const db = getDb();
      const feedback = await db.feedback.create({
        data: { patientId, campId, rating, comments },
      });
      sendSuccess(res, feedback, "Feedback submitted", 201);
    } catch (err) { next(err); }
  }

  async dispense(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw AppError.unauthorized();
      const { prescriptionId, campId } = req.body;
      const result = await pharmacyService.dispense(prescriptionId, campId, req.user.userId);
      sendSuccess(res, result, "Medicines dispensed");
    } catch (err) { next(err); }
  }

  async getMedicines(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const medicines = await pharmacyService.getMedicines(req.query.search as string);
      sendSuccess(res, medicines);
    } catch (err) { next(err); }
  }

  async getLowStockAlerts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const alerts = await pharmacyService.getLowStockAlerts();
      sendSuccess(res, alerts);
    } catch (err) { next(err); }
  }

  async getExpiringMedicines(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const days = parseInt(req.query.days as string) || 90;
      const medicines = await pharmacyService.getExpiringMedicines(days);
      sendSuccess(res, medicines);
    } catch (err) { next(err); }
  }

  async getTransactionHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const history = await pharmacyService.getTransactionHistory(
        req.query.medicineId as string,
        req.query.campId as string,
      );
      sendSuccess(res, history);
    } catch (err) { next(err); }
  }

  async addStock(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw AppError.unauthorized();
      const { medicineId, quantity, campId } = req.body;
      const result = await pharmacyService.addStock(medicineId, quantity, campId, req.user.userId);
      sendSuccess(res, result, "Stock added");
    } catch (err) { next(err); }
  }

  async getCampInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const inventory = await pharmacyService.getCampInventory(req.params.campId);
      sendSuccess(res, inventory);
    } catch (err) { next(err); }
  }
}
