import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import path from "path";

import { config } from "./config/env";
import { swaggerDefinition } from "./config/swagger";
import { errorHandler } from "./middlewares/error-handler";
import { logger } from "./utils/logger";

import authRoutes from "./routes/auth.routes";
import patientRoutes from "./routes/patient.routes";
import consultationRoutes from "./routes/consultation.routes";
import pharmacyRoutes from "./routes/pharmacy.routes";
import campRoutes from "./routes/camp.routes";
import analyticsRoutes from "./routes/analytics.routes";
import syncRoutes from "./routes/sync.routes";
import syncCloudRoutes from "./routes/sync-cloud.routes";

const app = express();

// ─── Security Middleware ───────────────────────────────────────────────────
app.use(helmet());

app.use(
  cors({
    origin: config.CORS_ORIGIN,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type"],
  }),
);

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20000,
    message: { success: false, message: "Too many requests, please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

// ─── Body Parsing ──────────────────────────────────────────────────────────
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Static File Serving ───────────────────────────────────────────────────
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// ─── Request Logger ────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`, { ip: req.ip });
  next();
});

// ─── Health Check ──────────────────────────────────────────────────────────
app.get("/api/v1/health", (_req, res) => {
  res.json({ status: "ok", env: config.NODE_ENV, timestamp: new Date().toISOString() });
});

// ─── API Routes ────────────────────────────────────────────────────────────
const v1 = "/api/v1";
app.use(`${v1}/auth`, authRoutes);
app.use(`${v1}/patients`, patientRoutes);
app.use(`${v1}/consultation`, consultationRoutes);
app.use(`${v1}/pharmacy`, pharmacyRoutes);
app.use(`${v1}/camps`, campRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/sync", syncRoutes);
app.use("/api/v1/sync-cloud", syncCloudRoutes);

// ─── Swagger Docs ──────────────────────────────────────────────────────────
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerDefinition, {
    customSiteTitle: "Arogya Camp OS API",
    swaggerOptions: { persistAuthorization: true },
  }),
);

// ─── 404 Handler ──────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found", code: "NOT_FOUND" });
});

// ─── Global Error Handler ─────────────────────────────────────────────────
app.use(errorHandler);

export default app;
