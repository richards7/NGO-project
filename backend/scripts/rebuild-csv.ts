import { PrismaClient } from "@prisma/client";
import { appendPatientToCSV } from "../src/utils/csv";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();
const CSV_FILE_PATH = path.join(process.cwd(), "uploads", "patients.csv");

async function main() {
  console.log("Rebuilding CSV file from database...");
  
  if (fs.existsSync(CSV_FILE_PATH)) {
    try {
      fs.unlinkSync(CSV_FILE_PATH);
    } catch (err: any) {
      if (err.code === "EBUSY") {
        console.error("Error: The CSV file is open and locked by Excel. Please close 'patients.csv' in Excel and try running the script again.");
        process.exit(1);
      }
      throw err;
    }
  }

  const patients = await prisma.patient.findMany({
    orderBy: { createdAt: "asc" }
  });

  console.log(`Found ${patients.length} patients in database. Rebuilding CSV...`);

  for (const patient of patients) {
    appendPatientToCSV(patient);
  }

  console.log("CSV file successfully rebuilt!");
}

main()
  .catch((e) => {
    console.error("Rebuild failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
