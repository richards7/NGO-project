import { Router, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { AuthController } from "../controllers/auth.controller";
import { validate } from "../middlewares/validate";
import { authenticate } from "../middlewares/auth";
import { loginSchema, registerUserSchema, refreshTokenSchema } from "../dtos/auth.dto";
import { config } from "../config/env";

const router = Router();
const ctrl = new AuthController();

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Returns access and refresh tokens
 */
router.post("/login", validate(loginSchema), ctrl.login.bind(ctrl));

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user (Admin only)
 */
router.post("/register", authenticate, validate(registerUserSchema), ctrl.register.bind(ctrl));

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token using refresh token
 */
router.post("/refresh", validate(refreshTokenSchema), ctrl.refresh.bind(ctrl));

router.post("/logout", authenticate, ctrl.logout.bind(ctrl));
router.get("/me", authenticate, ctrl.me.bind(ctrl));

/**
 * @swagger
 * /auth/powersync-token:
 *   get:
 *     tags: [Auth]
 *     summary: Get a JWT for PowerSync Service authentication
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Returns a PowerSync JWT and endpoint URL
 */
router.get("/powersync-token", authenticate, (req: Request, res: Response) => {
  const user = (req as any).user;

  // PowerSync requires specific JWT claims: sub, iat, exp
  const powersyncToken = jwt.sign(
    {
      sub: user.userId,
      user_id: user.userId,
      email: user.email,
      role: user.role,
    },
    config.JWT_SECRET,
    { expiresIn: "1h" },
  );

  res.json({
    success: true,
    data: {
      token: powersyncToken,
      endpoint: config.POWERSYNC_URL,
    },
  });
});

export default router;

