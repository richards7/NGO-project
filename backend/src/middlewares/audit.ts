import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";
import { logger } from "../utils/logger";

export function auditLog(action: string) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (req.user) {
      try {
        await prisma.auditLog.create({
          data: {
            userId: req.user.userId,
            action,
            details: JSON.stringify({
              method: req.method,
              path: req.path,
              body: req.body,
              ip: req.ip,
            }),
          },
        });
      } catch (err) {
        logger.error("Failed to write audit log", err);
      }
    }
    next();
  };
}
