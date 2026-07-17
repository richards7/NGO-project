import { Request, Response, NextFunction } from "express";
import { AnalyticsService } from "../services/analytics.service";
import { sendSuccess } from "../utils/response";

const analyticsService = new AnalyticsService();

export class AnalyticsController {
  async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await analyticsService.getDashboardSummary(req.query.campId as string);
      sendSuccess(res, data);
    } catch (err) { next(err); }
  }

  async getDiseaseDistribution(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await analyticsService.getDiseaseDistribution());
    } catch (err) { next(err); }
  }

  async getGenderDistribution(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await analyticsService.getGenderDistribution());
    } catch (err) { next(err); }
  }

  async getAgeDistribution(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await analyticsService.getAgeDistribution());
    } catch (err) { next(err); }
  }

  async getMostPrescribed(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await analyticsService.getMostPrescribedMedicines());
    } catch (err) { next(err); }
  }

  async getInventoryStatus(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await analyticsService.getInventoryStatus());
    } catch (err) { next(err); }
  }

  async getPatientsPerCamp(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await analyticsService.getPatientsPerCamp());
    } catch (err) { next(err); }
  }

  async getDoctorPerformance(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await analyticsService.getDoctorPerformance());
    } catch (err) { next(err); }
  }

  async getFeedbackAnalytics(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await analyticsService.getFeedbackAnalytics());
    } catch (err) { next(err); }
  }

  async getAllFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const search = req.query.search as string | undefined;
      const data = await analyticsService.getAllFeedback(page, limit, search);
      sendSuccess(res, data);
    } catch (err) { next(err); }
  }
}
