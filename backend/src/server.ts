import app from "./app";
import { config } from "./config/env";
import prisma from "./config/database";
import { logger } from "./utils/logger";

async function bootstrap() {
  try {
    await prisma.$connect();
    logger.info("✅ Database connected");

    const server = app.listen(config.PORT, () => {
      logger.info(`🚀 Arogya Camp OS Backend running on http://localhost:${config.PORT}`);
      logger.info(`📖 API Docs: http://localhost:${config.PORT}/api-docs`);
      logger.info(`🌍 Environment: ${config.NODE_ENV}`);
    });

    // Graceful shutdown
    process.on("SIGTERM", async () => {
      logger.info("SIGTERM received. Shutting down gracefully...");
      server.close(async () => {
        await prisma.$disconnect();
        logger.info("Server closed.");
        process.exit(0);
      });
    });

    process.on("SIGINT", async () => {
      logger.info("SIGINT received. Shutting down...");
      await prisma.$disconnect();
      process.exit(0);
    });
  } catch (err) {
    logger.error("Failed to start server", err);
    process.exit(1);
  }
}

bootstrap();
