import fs from "fs";
import path from "path";
import { logger } from "./logger";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const CSV_FILE_PATH = path.join(UPLOADS_DIR, "patients.csv");

function escapeCsvValue(val: any): string {
  if (val === null || val === undefined) return "";
  let str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    str = '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export function appendPatientToCSV(patient: any): void {
  try {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    const headers = ["ID", "Token", "Name", "Age", "Gender", "Village", "Phone", "Priority", "Status", "RegisteredAt"];
    const row = [
      patient.id,
      patient.token || "",
      patient.name,
      patient.age,
      patient.gender,
      patient.village,
      patient.phone || "",
      patient.priority || "normal",
      patient.status || "Registered",
      patient.createdAt ? new Date(patient.createdAt).toISOString() : new Date().toISOString()
    ];

    const fileExists = fs.existsSync(CSV_FILE_PATH);
    const csvRow = row.map(escapeCsvValue).join(",") + "\n";

    if (!fileExists) {
      fs.writeFileSync(CSV_FILE_PATH, headers.join(",") + "\n" + csvRow);
    } else {
      fs.appendFileSync(CSV_FILE_PATH, csvRow);
    }

    logger.info(`Patient ${patient.id} successfully appended to CSV sheet: ${CSV_FILE_PATH}`);
  } catch (err: any) {
    if (err.code === "EBUSY") {
      logger.error(`[EBUSY] Failed to append patient to CSV spreadsheet because the file is open and locked by another application (like Microsoft Excel). Please close 'patients.csv' in Excel so the server can write to it.`, err);
    } else {
      logger.error("Failed to append patient to CSV spreadsheet", err);
    }
  }
}
