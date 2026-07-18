import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/env";
import { AppError } from "../utils/app-error";
import { getDb } from "../config/database";

export interface AuthPayload {
  userId: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw AppError.unauthorized("No token provided");
  }

  const token = header.split(" ")[1];
  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as AuthPayload;
    req.user = payload;
    next();
  } catch (err: any) {
    // In Local Camp Mode (SQLite), we allow tokens to expire up to 24h later
    // to support devices that went offline right as their token expired.
    if (err.name === "TokenExpiredError" && process.env.DB_MODE === "sqlite") {
      const decoded = jwt.decode(token) as any;
      if (decoded && decoded.exp) {
        const expiredSinceMs = Date.now() - (decoded.exp * 1000);
        if (expiredSinceMs < 24 * 60 * 60 * 1000) {
          req.user = decoded as AuthPayload;
          return next();
        }
      }
    }
    throw AppError.unauthorized("Invalid or expired token");
  }
}

export function authorize(...allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw AppError.unauthorized();
    }
    if (!allowedRoles.includes(req.user.role)) {
      throw AppError.forbidden(`Role '${req.user.role}' is not authorized for this resource`);
    }
    next();
  };
}

export function requirePermission(permissionName: string) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      throw AppError.unauthorized();
    }

    const db = getDb();
    let role;
    if (db.mode === "prisma") {
      const p = db as any; // PrismaAdapter has raw prisma
      role = await p.prisma.role.findFirst({
        where: { name: req.user.role },
        include: { permissions: true },
      });
    } else {
      role = await db.role.findUnique({
        where: { name: req.user.role },
        include: { permissions: { include: { permission: true } } }
      });
    }

    if (!role) {
      throw AppError.forbidden("Role not found");
    }

    // Adapt for sqlite which might return different structure
    const hasPermission = db.mode === "prisma" 
      ? role.permissions.some((p: any) => p.name === permissionName)
      : role.permissions?.some((p: any) => p.name === permissionName);
    if (!hasPermission) {
      throw AppError.forbidden(`Missing permission: ${permissionName}`);
    }

    next();
  };
}
