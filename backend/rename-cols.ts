import Database from "better-sqlite3";
import path from "path";

const db = new Database(path.join(__dirname, "camp_data.db"));

const tables = [
  "roles", "users", "camps", "patients", "vitals", "prescriptions",
  "medicines", "medicine_categories", "prescription_medicines",
  "inventory", "medicine_transactions", "doctor_notes", "follow_ups",
  "feedback", "families", "health_cards", "diseases", "allergies"
];

for (const table of tables) {
  try {
    db.exec(`ALTER TABLE "${table}" RENAME COLUMN "createdAt" TO "created_at"`);
    db.exec(`ALTER TABLE "${table}" RENAME COLUMN "updatedAt" TO "updated_at"`);
    console.log(`Renamed columns in ${table}`);
  } catch (e: any) {
    console.log(`Skipped ${table}: ${e.message}`);
  }
}

db.close();
