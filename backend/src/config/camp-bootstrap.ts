import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { logger } from "../utils/logger";

const SEED_FILE = path.join(__dirname, "seed-fixtures.json");

const DDL = `
-- Core Tables
CREATE TABLE IF NOT EXISTS "roles" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT UNIQUE NOT NULL,
  "description" TEXT,
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL,
  "_version" INTEGER DEFAULT 1,
  "_synced" INTEGER DEFAULT 0,
  "_deleted" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT UNIQUE NOT NULL,
  "password_hash" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role_id" TEXT,
  "refresh_token" TEXT,
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL,
  "_version" INTEGER DEFAULT 1,
  "_synced" INTEGER DEFAULT 0,
  "_deleted" INTEGER DEFAULT 0,
  FOREIGN KEY("role_id") REFERENCES "roles"("id")
);

CREATE TABLE IF NOT EXISTS "camps" (
  "id" TEXT PRIMARY KEY,
  "camp_code" TEXT UNIQUE NOT NULL,
  "name" TEXT NOT NULL,
  "location" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "status" TEXT DEFAULT 'Scheduled',
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL,
  "_version" INTEGER DEFAULT 1,
  "_synced" INTEGER DEFAULT 0,
  "_deleted" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "patients" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "age" INTEGER NOT NULL,
  "gender" TEXT NOT NULL,
  "village" TEXT NOT NULL,
  "phone" TEXT,
  "family_id" TEXT,
  "priority" TEXT DEFAULT 'normal',
  "status" TEXT DEFAULT 'Registered',
  "token" TEXT,
  "queue_priority" TEXT,
  "queue_reason" TEXT,
  "queued_at" TEXT,
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL,
  "_version" INTEGER DEFAULT 1,
  "_synced" INTEGER DEFAULT 0,
  "_deleted" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "vitals" (
  "id" TEXT PRIMARY KEY,
  "patient_id" TEXT NOT NULL,
  "bp" TEXT NOT NULL,
  "sugar" INTEGER NOT NULL,
  "temp" REAL NOT NULL,
  "pulse" INTEGER NOT NULL,
  "spo2" INTEGER NOT NULL,
  "height" REAL,
  "weight" REAL,
  "pregnancy_status" TEXT,
  "emergency_condition" INTEGER DEFAULT 0,
  "notes" TEXT,
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL,
  "_version" INTEGER DEFAULT 1,
  "_synced" INTEGER DEFAULT 0,
  "_deleted" INTEGER DEFAULT 0,
  FOREIGN KEY("patient_id") REFERENCES "patients"("id")
);

CREATE TABLE IF NOT EXISTS "prescriptions" (
  "id" TEXT PRIMARY KEY,
  "doctor_id" TEXT NOT NULL,
  "patient_id" TEXT NOT NULL,
  "camp_id" TEXT NOT NULL,
  "advice" TEXT,
  "qr_image" TEXT,
  "pdf_path" TEXT,
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL,
  "_version" INTEGER DEFAULT 1,
  "_synced" INTEGER DEFAULT 0,
  "_deleted" INTEGER DEFAULT 0,
  FOREIGN KEY("doctor_id") REFERENCES "users"("id"),
  FOREIGN KEY("patient_id") REFERENCES "patients"("id"),
  FOREIGN KEY("camp_id") REFERENCES "camps"("id")
);

CREATE TABLE IF NOT EXISTS "medicines" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT UNIQUE NOT NULL,
  "category_id" TEXT,
  "batch_number" TEXT,
  "expiry_date" TEXT,
  "stock" INTEGER DEFAULT 0,
  "alert_level" INTEGER DEFAULT 50,
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL,
  "_version" INTEGER DEFAULT 1,
  "_synced" INTEGER DEFAULT 0,
  "_deleted" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "medicine_categories" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT UNIQUE NOT NULL,
  "description" TEXT,
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL,
  "_version" INTEGER DEFAULT 1,
  "_synced" INTEGER DEFAULT 0,
  "_deleted" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "prescription_medicines" (
  "id" TEXT PRIMARY KEY,
  "prescription_id" TEXT NOT NULL,
  "medicine_id" TEXT NOT NULL,
  "dosage" TEXT NOT NULL,
  "frequency" TEXT NOT NULL,
  "duration" TEXT NOT NULL,
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL,
  "_version" INTEGER DEFAULT 1,
  "_synced" INTEGER DEFAULT 0,
  "_deleted" INTEGER DEFAULT 0,
  FOREIGN KEY("prescription_id") REFERENCES "prescriptions"("id"),
  FOREIGN KEY("medicine_id") REFERENCES "medicines"("id")
);

CREATE TABLE IF NOT EXISTS "inventory" (
  "id" TEXT PRIMARY KEY,
  "camp_id" TEXT NOT NULL,
  "medicine_id" TEXT NOT NULL,
  "quantity" INTEGER DEFAULT 0,
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL,
  "_version" INTEGER DEFAULT 1,
  "_synced" INTEGER DEFAULT 0,
  "_deleted" INTEGER DEFAULT 0,
  FOREIGN KEY("camp_id") REFERENCES "camps"("id"),
  FOREIGN KEY("medicine_id") REFERENCES "medicines"("id"),
  UNIQUE("camp_id", "medicine_id")
);

CREATE TABLE IF NOT EXISTS "medicine_transactions" (
  "id" TEXT PRIMARY KEY,
  "medicine_id" TEXT NOT NULL,
  "camp_id" TEXT,
  "quantity" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL,
  "_version" INTEGER DEFAULT 1,
  "_synced" INTEGER DEFAULT 0,
  "_deleted" INTEGER DEFAULT 0,
  FOREIGN KEY("medicine_id") REFERENCES "medicines"("id"),
  FOREIGN KEY("camp_id") REFERENCES "camps"("id"),
  FOREIGN KEY("user_id") REFERENCES "users"("id")
);

CREATE TABLE IF NOT EXISTS "doctor_notes" (
  "id" TEXT PRIMARY KEY,
  "prescription_id" TEXT NOT NULL,
  "camp_id" TEXT NOT NULL,
  "doctor_id" TEXT NOT NULL,
  "notes" TEXT NOT NULL,
  "diagnosis" TEXT NOT NULL,
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL,
  "_version" INTEGER DEFAULT 1,
  "_synced" INTEGER DEFAULT 0,
  "_deleted" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "follow_ups" (
  "id" TEXT PRIMARY KEY,
  "patient_id" TEXT NOT NULL,
  "notes" TEXT NOT NULL,
  "due_date" TEXT NOT NULL,
  "status" TEXT DEFAULT 'Pending',
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL,
  "_version" INTEGER DEFAULT 1,
  "_synced" INTEGER DEFAULT 0,
  "_deleted" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "feedback" (
  "id" TEXT PRIMARY KEY,
  "patient_id" TEXT NOT NULL,
  "camp_id" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "comments" TEXT,
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL,
  "_version" INTEGER DEFAULT 1,
  "_synced" INTEGER DEFAULT 0,
  "_deleted" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "families" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "health_card_id" TEXT,
  "head_of_household_id" TEXT,
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL,
  "_version" INTEGER DEFAULT 1,
  "_synced" INTEGER DEFAULT 0,
  "_deleted" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "health_cards" (
  "id" TEXT PRIMARY KEY,
  "card_number" TEXT UNIQUE NOT NULL,
  "qr_code_url" TEXT,
  "issue_date" TEXT NOT NULL,
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL,
  "_version" INTEGER DEFAULT 1,
  "_synced" INTEGER DEFAULT 0,
  "_deleted" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "diseases" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT UNIQUE NOT NULL,
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL,
  "_version" INTEGER DEFAULT 1,
  "_synced" INTEGER DEFAULT 0,
  "_deleted" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "allergies" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT UNIQUE NOT NULL,
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL,
  "_version" INTEGER DEFAULT 1,
  "_synced" INTEGER DEFAULT 0,
  "_deleted" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "_patient_diseases" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL,
  PRIMARY KEY ("A", "B")
);

CREATE TABLE IF NOT EXISTS "_patient_allergies" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL,
  PRIMARY KEY ("A", "B")
);
`;

export function bootstrapDb(db: Database.Database) {
  logger.info("[CampBootstrap] Running DDL...");
  db.exec(DDL);
  logger.info("[CampBootstrap] DDL applied.");

  // Check if users exist (seed if empty)
  const userCount = (db.prepare('SELECT COUNT(*) as c FROM "users"').get() as any).c;
  if (userCount === 0) {
    logger.info("[CampBootstrap] Database empty. Seeding initial data...");
    if (fs.existsSync(SEED_FILE)) {
      const data = JSON.parse(fs.readFileSync(SEED_FILE, "utf-8"));
      
      const insertRole = db.prepare('INSERT INTO "roles" (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)');
      for (const role of data.roles || []) {
        insertRole.run(role.id, role.name, role.description, role.createdAt, role.updatedAt);
      }

      const insertUser = db.prepare('INSERT INTO "users" (id, email, password_hash, name, role_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
      for (const user of data.users || []) {
        insertUser.run(user.id, user.email, user.passwordHash, user.name, user.roleId, user.createdAt, user.updatedAt);
      }

      const insertCamp = db.prepare('INSERT INTO "camps" (id, camp_code, name, location, date, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
      for (const camp of data.camps || []) {
        insertCamp.run(camp.id, camp.campCode, camp.name, camp.location, camp.date, camp.status, camp.createdAt, camp.updatedAt);
      }

      logger.info("[CampBootstrap] Seeding complete.");
    } else {
      logger.warn("[CampBootstrap] Seed file not found!");
    }
  } else {
    logger.info("[CampBootstrap] Database already seeded.");
  }
}
