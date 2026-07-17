import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/env";
import { AppError } from "../utils/app-error";
import prisma from "../config/database";

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
  } catch {
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

    const role = await prisma.role.findFirst({
      where: { name: req.user.role },
      include: { permissions: true },
    });

    if (!role) {
      throw AppError.forbidden("Role not found");
    }

    const hasPermission = role.permissions.some((p) => p.name === permissionName);
    if (!hasPermission) {
      throw AppError.forbidden(`Missing permission: ${permissionName}`);
    }

    next();
  };
}
