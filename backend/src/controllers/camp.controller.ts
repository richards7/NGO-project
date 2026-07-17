import { Request, Response, NextFunction } from "express";
import { CampService } from "../services/camp.service";
import { sendSuccess } from "../utils/response";

const campService = new CampService();

export class CampController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const camp = await campService.create(req.body);
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
}
