import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(2),
  roleName: z.enum(["admin", "registration", "medical_assistant", "doctor", "pharmacy"]),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export type LoginDTO = z.infer<typeof loginSchema>;
export type RegisterUserDTO = z.infer<typeof registerUserSchema>;
export type RefreshTokenDTO = z.infer<typeof refreshTokenSchema>;
