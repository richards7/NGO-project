import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth.service";
import { sendSuccess } from "../utils/response";

const authService = new AuthService();

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.login(req.body);
      sendSuccess(res, result, "Login successful");
    } catch (err) { next(err); }
  }

  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.register(req.body);
      sendSuccess(res, result, "User registered successfully", 201);
    } catch (err) { next(err); }
  }

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.refreshToken(req.body.refreshToken);
      sendSuccess(res, result, "Token refreshed");
    } catch (err) { next(err); }
  }

  async logout(_req: Request, res: Response): Promise<void> {
    // JWT is stateless; client must discard token.
    // Extend here with a token blacklist if needed.
    sendSuccess(res, null, "Logged out successfully");
  }

  async me(req: Request, res: Response): Promise<void> {
    sendSuccess(res, req.user, "Current user");
  }
}
