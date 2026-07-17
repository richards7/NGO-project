import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/app-error";
import { logger } from "../utils/logger";
import { sendError } from "../utils/response";

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    logger.warn(`AppError: ${err.message}`, { code: err.code, statusCode: err.statusCode });
    sendError(res, err.message, err.statusCode, err.code);
    return;
  }

  logger.error(`Unhandled Error: ${err.message}`, { stack: err.stack });
  sendError(res, "Internal server error", 500, "INTERNAL_ERROR");
}
