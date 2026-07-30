import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDb } from "../config/database";
import { config } from "../config/env";
import { AppError } from "../utils/app-error";
import type { LoginDTO, RegisterUserDTO } from "../dtos/auth.dto";
import type { AuthPayload } from "../middlewares/auth";
import { logger } from "../utils/logger";
import { ExcelSyncService } from "./excel-sync.service";

export class AuthService {
  private excelSync = ExcelSyncService.getInstance();

  async login(dto: LoginDTO) {
    const db = getDb();
    
    logger.debug(`[Auth] Login attempt: email=${dto.email}, role=${dto.roleName}, campCode=${dto.campCode}`);

    const user = await db.user.findUnique({
      where: { email: dto.email },
      include: { role: true, camp: true },
    });

    if (!user) {
      logger.debug(`[Auth] Failed: User not found (${dto.email})`);
      throw AppError.unauthorized("Invalid credentials");
    }
    
    if (user.role.name !== dto.roleName) {
      logger.debug(`[Auth] Failed: Role mismatch (expected ${dto.roleName}, got ${user.role.name})`);
      throw AppError.unauthorized(`User not found with role: ${dto.roleName}`);
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      logger.debug(`[Auth] Failed: Incorrect password for ${dto.email}`);
      throw AppError.unauthorized("Invalid credentials");
    }

    let campId: string | undefined = undefined;
    if (user.role.name !== "admin") {
      if (!dto.campCode) {
        logger.debug(`[Auth] Failed: Missing Camp ID for non-admin`);
        throw AppError.badRequest("Camp ID is required for this role");
      }
      if (!user.campId || !user.camp) {
        logger.debug(`[Auth] Failed: User ${dto.email} has no assigned camp`);
        throw AppError.forbidden("Access denied: You are not assigned to any camp");
      }
      if (user.camp.campCode !== dto.campCode) {
        logger.debug(`[Auth] Failed: Camp mismatch (user camp ${user.camp.campCode} != requested ${dto.campCode})`);
        throw AppError.forbidden("Access denied: You are not authorized for this Camp ID.");
      }
      campId = user.campId;
    }

    logger.debug(`[Auth] Success: ${dto.email} authenticated`);
    const payload: AuthPayload = { userId: user.id, email: user.email, role: user.role.name, campId };

    const accessToken = jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN as any,
    });

    const refreshToken = jwt.sign(payload, config.JWT_REFRESH_SECRET, {
      expiresIn: config.JWT_REFRESH_EXPIRES_IN as any,
    });

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role.name },
    };
  }

  async register(dto: RegisterUserDTO) {
    const db = getDb();
    const existing = await db.user.findUnique({ where: { email: dto.email } });
    if (existing) throw AppError.conflict("Email already registered");

    const role = await db.role.findUnique({ where: { name: dto.roleName } });
    if (!role) throw AppError.badRequest(`Role '${dto.roleName}' does not exist`);

    let campId: string | undefined = undefined;
    if (role.name !== "admin") {
      if (!dto.campCode) throw AppError.badRequest("Camp Code is required for non-admin roles");
      const cleanCode = dto.campCode.trim();
      const camp = await db.camp.findUnique({ where: { campCode: cleanCode } });
      if (!camp) throw AppError.badRequest("Invalid Camp Code");
      campId = camp.id;
    }

    const hash = await bcrypt.hash(dto.password, 12);

    const user = await db.user.create({
      data: { email: dto.email, name: dto.name, passwordHash: hash, roleId: role.id, campId },
      include: { role: true },
    });

    // Sync workbook so new staff appears in the camp Excel
    if (campId) {
      this.excelSync.syncWorkbook(campId).catch(() => {});
    }

    return { id: user.id, name: user.name, email: user.email, role: user.role.name };
  }


  async refreshToken(token: string) {
    const db = getDb();
    try {
      const payload = jwt.verify(token, config.JWT_REFRESH_SECRET) as AuthPayload;

      const accessToken = jwt.sign(
        { userId: payload.userId, email: payload.email, role: payload.role, campId: payload.campId },
        config.JWT_SECRET,
        { expiresIn: config.JWT_EXPIRES_IN as any },
      );

      return { accessToken };
    } catch {
      throw AppError.unauthorized("Invalid or expired refresh token");
    }
  }
}
