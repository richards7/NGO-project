import fs from "fs";
import path from "path";
import { config } from "../config/env";

const LOG_DIR = config.LOG_DIR;
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

const logFile = path.join(LOG_DIR, "app.log");

type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

function write(level: LogLevel, message: string, meta?: unknown): void {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` | ${JSON.stringify(meta)}` : "";
  const line = `[${timestamp}] [${level}] ${message}${metaStr}\n`;

  if (config.NODE_ENV !== "test") {
    process.stdout.write(line);
    fs.appendFileSync(logFile, line);
  }
}

export const logger = {
  info: (msg: string, meta?: unknown) => write("INFO", msg, meta),
  warn: (msg: string, meta?: unknown) => write("WARN", msg, meta),
  error: (msg: string, meta?: unknown) => write("ERROR", msg, meta),
  debug: (msg: string, meta?: unknown) => write("DEBUG", msg, meta),
};
