import { Request, Response, NextFunction } from "express";
import { SyncService } from "../services/sync.service";
import { PredictionService } from "../services/prediction.service";
import { sendSuccess } from "../utils/response";
import { AppError } from "../utils/app-error";

const syncService = new SyncService();
const predictionService = new PredictionService();

export class SyncController {
  async pull(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const since = (req.query.since as string) || new Date(0).toISOString();
      const campId = req.query.campId as string | undefined;
      const result = await syncService.pull();
      sendSuccess(res, result, "Pull sync completed");
    } catch (err) { next(err); }
  }

  async push(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw AppError.unauthorized();
      // Use the new PowerSync batch processing
      const result = await syncService.processPowerSyncBatch(req.body.batches, req.user.userId);
      sendSuccess(res, result, "Push sync completed");
    } catch (err) { next(err); }
  }
}

export class PredictionController {
  async predict(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await predictionService.predict(req.body);
      sendSuccess(res, result, "Prediction generated");
    } catch (err) { next(err); }
  }
}
