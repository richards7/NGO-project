import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDb } from "../config/database";
import { config } from "../config/env";
import { AppError } from "../utils/app-error";
import type { LoginDTO, RegisterUserDTO } from "../dtos/auth.dto";
import type { AuthPayload } from "../middlewares/auth";

export class AuthService {
  async login(dto: LoginDTO) {
    const db = getDb();
    const user = await db.user.findUnique({
      where: { email: dto.email },
      include: { role: true },
    });

    if (!user) throw AppError.unauthorized("Invalid credentials");

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw AppError.unauthorized("Invalid credentials");

    const payload: AuthPayload = { userId: user.id, email: user.email, role: user.role.name };

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

    const hash = await bcrypt.hash(dto.password, 12);

    const user = await db.user.create({
      data: { email: dto.email, name: dto.name, passwordHash: hash, roleId: role.id },
      include: { role: true },
    });

    return { id: user.id, name: user.name, email: user.email, role: user.role.name };
  }

  async refreshToken(token: string) {
    const db = getDb();
    try {
      const payload = jwt.verify(token, config.JWT_REFRESH_SECRET) as AuthPayload;

      const accessToken = jwt.sign(
        { userId: payload.userId, email: payload.email, role: payload.role },
        config.JWT_SECRET,
        { expiresIn: config.JWT_EXPIRES_IN as any },
      );

      return { accessToken };
    } catch {
      throw AppError.unauthorized("Invalid or expired refresh token");
    }
  }
}
