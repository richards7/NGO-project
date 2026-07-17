import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  UPLOAD_DIR: z.string().default("./uploads"),
  LOG_DIR: z.string().default("./logs"),
  // PowerSync integration
  POWERSYNC_URL: z.string().default("http://localhost:8080"),
  POWERSYNC_PUBLIC_KEY: z.string().default(""),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
