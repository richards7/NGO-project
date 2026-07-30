import { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { CampService } from "../services/camp.service";
import { ExcelSyncService } from "../services/excel-sync.service";
import { sendSuccess } from "../utils/response";

const campService = new CampService();
const excelSync = ExcelSyncService.getInstance();

export class CampController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = { ...req.body, ngoId: req.user?.userId };
      const camp = await campService.create(data);
      sendSuccess(res, camp, "Camp created", 201);
    } catch (err) { next(err); }
  }

  async findAll(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const camps = await campService.findAll();
      sendSuccess(res, camps);
    } catch (err) { next(err); }
  }

  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const camp = await campService.findById(req.params.id);
      sendSuccess(res, camp);
    } catch (err) { next(err); }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const camp = await campService.update(req.params.id, req.body);
      sendSuccess(res, camp, "Camp updated");
    } catch (err) { next(err); }
  }

  async createFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const feedback = await campService.createFeedback(req.body);
      sendSuccess(res, feedback, "Feedback submitted", 201);
    } catch (err) { next(err); }
  }

  async getFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await campService.getFeedbackByCamp(req.params.id);
      sendSuccess(res, result);
    } catch (err) { next(err); }
  }

  /**
   * GET /camps/:id/overview — Full camp overview with staff, patients, inventory
   */
  async getOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const overview = await campService.getDetailedOverview(req.params.id);
      sendSuccess(res, overview);
    } catch (err) { next(err); }
  }

  /**
   * GET /camps/:id/workbook — Download the pre-generated Excel workbook
   */
  async downloadWorkbook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const camp = await campService.findById(req.params.id);

      // Force a fresh sync before download
      await excelSync.syncWorkbook(req.params.id);

      const filePath = excelSync.getWorkbookPath(camp.campCode);
      if (!fs.existsSync(filePath)) {
        res.status(404).json({ success: false, message: "Workbook not found. Please sync first." });
        return;
      }

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${camp.campCode}.xlsx"`
      );

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (err) { next(err); }
  }

  /**
   * GET /camps/:id/sync-status — Returns last sync time and summary stats
   */
  async getSyncStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const overview = await campService.getDetailedOverview(req.params.id);
      sendSuccess(res, {
        campId: req.params.id,
        campCode: overview.camp.campCode,
        lastSyncTime: overview.lastSyncTime,
        patientCount: overview.patientSummary.totalPatients,
        doctorCount: overview.staff.doctors.length,
        registrationCount: overview.staff.registrationTeam.length,
        pharmacyCount: overview.staff.pharmacyTeam.length,
      });
    } catch (err) { next(err); }
  }

  /**
   * POST /camps/:id/sync — Force a workbook sync
   */
  async forceSync(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await excelSync.syncWorkbook(req.params.id);
      sendSuccess(res, {
        lastSyncTime: excelSync.getLastSyncTime(req.params.id),
      }, "Workbook synced successfully");
    } catch (err) { next(err); }
  }

  /**
   * Legacy: GET /camps/:id/export — Generate and stream Excel
   */
  async exportCamp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workbook = await excelSync.generateWorkbook(req.params.id);
      
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="camp_report_${req.params.id}.xlsx"`
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (err) { next(err); }
  }
}
