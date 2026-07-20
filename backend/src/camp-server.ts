import dotenv from "dotenv";
import path from "path";

// Load standard env first
dotenv.config();

// Override strictly for camp mode
process.env.DATABASE_ADAPTER = "sqlite";
process.env.PORT = process.env.CAMP_PORT || "5000";
process.env.JWT_SECRET = process.env.JWT_SECRET || "offline_camp_secret_key_123";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "offline_camp_refresh_secret_key_456";

// Ensure sqlite database goes to the right place
const dbPath = path.join(process.cwd(), "camp_data.db");
process.env.DATABASE_URL = `file:${dbPath}`;

import { logger } from "./utils/logger";
import { initDb, getDb } from "./config/database";
import app from "./app";
import { connectivityWatcher } from "./services/connectivity-watcher";

async function startCampServer() {
  logger.info("===============================================");
  logger.info("🏕️  AROGYA CAMP OS — LOCAL CAMP SERVER STARTING");
  logger.info("===============================================");

  try {
    // 1. Initialize SQLite Database (which will trigger bootstrapDb)
    await initDb("sqlite", dbPath);

    // 2. Start HTTP Server
    const port = parseInt(process.env.PORT || "5000", 10);
    const server = app.listen(port, "0.0.0.0", () => {
      logger.info(`✅ Local Camp Server running on http://0.0.0.0:${port}`);
    });

    // 3. Start Connectivity Watcher
    connectivityWatcher.start();

    // 3. Graceful shutdown
    const shutdown = async () => {
      logger.info("Shutting down Camp Server...");
      server.close();
      await getDb().$disconnect();
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

  } catch (err) {
    logger.error("Failed to start Camp Server:", err);
    process.exit(1);
  }
}

startCampServer();
