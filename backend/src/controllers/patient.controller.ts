import { Request, Response, NextFunction } from "express";
import { PatientService } from "../services/patient.service";
import { sendSuccess, sendPaginated } from "../utils/response";

const patientService = new PatientService();

export class PatientController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const patient = await patientService.create(req.body);
      sendSuccess(res, patient, "Patient registered successfully", 201);
    } catch (err) { next(err); }
  }

  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string | undefined;
      const { patients, total } = await patientService.findAll(page, limit, search);
      sendPaginated(res, patients, total, page, limit);
    } catch (err) { next(err); }
  }

  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const patient = await patientService.findById(req.params.id);
      sendSuccess(res, patient);
    } catch (err) { next(err); }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const patient = await patientService.update(req.params.id, req.body);
      sendSuccess(res, patient, "Patient updated");
    } catch (err) { next(err); }
  }

  async captureVitals(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vitals = await patientService.captureVitals(req.body);
      sendSuccess(res, vitals, "Vitals captured", 201);
    } catch (err) { next(err); }
  }

  async updateVitals(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vitals = await patientService.updateVitalsByPatient(req.params.id, req.body);
      sendSuccess(res, vitals, "Vitals updated", 200);
    } catch (err) { next(err); }
  }

  async getQueue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const queue = await patientService.getQueue(req.query.campId as string);
      sendSuccess(res, queue, "Queue fetched");
    } catch (err) { next(err); }
  }

  async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const history = await patientService.getPatientHistory(req.params.id);
      sendSuccess(res, history);
    } catch (err) { next(err); }
  }

  async getPharmacyQueue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const queue = await patientService.getPharmacyQueue();
      sendSuccess(res, queue, "Pharmacy queue fetched");
    } catch (err) { next(err); }
  }

  async createFamily(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const family = await patientService.createFamily(req.body);
      sendSuccess(res, family, "Family registered", 201);
    } catch (err) { next(err); }
  }

  async findFamilyById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const family = await patientService.findFamilyById(req.params.id);
      sendSuccess(res, family);
    } catch (err) { next(err); }
  }

  async searchFamilies(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const families = await patientService.searchFamilies(req.query.q as string ?? "");
      sendSuccess(res, families);
    } catch (err) { next(err); }
  }

  async exportCSV(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const fs = await import("fs");
      const path = await import("path");
      const filePath = path.join(process.cwd(), "uploads", "patients.csv");

      if (!fs.existsSync(filePath)) {
        res.status(404).json({ success: false, message: "No patients registered yet. CSV file does not exist." });
        return;
      }

      res.download(filePath, "patients.csv");
    } catch (err) { next(err); }
  }
}
