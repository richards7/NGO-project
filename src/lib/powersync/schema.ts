/**
 * PowerSync client-side SQLite schema.
 * Mirrors the Prisma models in backend/prisma/schema.prisma.
 *
 * Notes:
 *  - PowerSync auto-creates an `id TEXT PRIMARY KEY` column on every table.
 *  - Only column types `text`, `integer`, and `real` are supported.
 *  - Timestamps are stored as ISO-8601 text strings.
 */
import { column, Schema, Table } from "@powersync/web";

// ── Reference / lookup tables (read-only on client) ────────────────────

const roles = new Table({
  name: column.text,
  description: column.text,
});

const users = new Table({
  email: column.text,
  name: column.text,
  role_id: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const medicine_categories = new Table({
  name: column.text,
  description: column.text,
});

const diseases = new Table({
  name: column.text,
  description: column.text,
});

const allergies = new Table({
  name: column.text,
  description: column.text,
});

// ── Core domain tables ─────────────────────────────────────────────────

const camps = new Table(
  {
    camp_code: column.text,
    name: column.text,
    location: column.text,
    date: column.text,
    status: column.text, // "Scheduled" | "Active" | "Completed"
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { status: ["status"] } },
);

const patients = new Table(
  {
    token: column.text,
    name: column.text,
    age: column.integer,
    gender: column.text,
    village: column.text,
    phone: column.text,
    priority: column.text,
    status: column.text,
    queue_priority: column.text,
    queue_reason: column.text,
    queued_at: column.text,
    family_id: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  {
    indexes: {
      status: ["status"],
      queue: ["queue_priority", "status"],
      family: ["family_id"],
    },
  },
);

const families = new Table({
  name: column.text,
  head_of_household_id: column.text,
  health_card_id: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const health_cards = new Table({
  card_number: column.text,
  issue_date: column.text,
  expiry_date: column.text,
});

const vitals = new Table(
  {
    bp: column.text,
    sugar: column.integer,
    temp: column.real,
    pulse: column.integer,
    spo2: column.integer,
    height: column.real,
    weight: column.real,
    pregnancy_status: column.text,
    emergency_condition: column.integer, // 0 | 1 boolean
    notes: column.text,
    patient_id: column.text,
    created_at: column.text,
  },
  { indexes: { patient: ["patient_id"] } },
);

const prescriptions = new Table(
  {
    doctor_id: column.text,
    patient_id: column.text,
    camp_id: column.text,
    qr_image: column.text,
    pdf_path: column.text,
    advice: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { patient: ["patient_id"], camp: ["camp_id"] } },
);

const prescription_medicines = new Table(
  {
    prescription_id: column.text,
    medicine_id: column.text,
    dosage: column.text,
    frequency: column.text,
    duration: column.text,
  },
  { indexes: { prescription: ["prescription_id"] } },
);

const medicines = new Table(
  {
    name: column.text,
    category_id: column.text,
    batch_number: column.text,
    expiry_date: column.text,
    stock: column.integer,
    alert_level: column.integer,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { category: ["category_id"] } },
);

const inventory = new Table(
  {
    camp_id: column.text,
    medicine_id: column.text,
    quantity: column.integer,
    reserved: column.integer,
    updated_at: column.text,
  },
  { indexes: { camp_medicine: ["camp_id", "medicine_id"] } },
);

const medicine_transactions = new Table(
  {
    medicine_id: column.text,
    camp_id: column.text,
    quantity: column.integer,
    type: column.text, // "IN" | "OUT" | "DISPENSED" | "ADJUSTMENT"
    user_id: column.text,
    created_at: column.text,
  },
  { indexes: { medicine: ["medicine_id"] } },
);

const doctor_notes = new Table(
  {
    prescription_id: column.text,
    camp_id: column.text,
    notes: column.text,
    diagnosis: column.text,
    doctor_id: column.text,
    created_at: column.text,
  },
  { indexes: { prescription: ["prescription_id"] } },
);

const follow_ups = new Table(
  {
    patient_id: column.text,
    notes: column.text,
    due_date: column.text,
    completed: column.integer, // 0 | 1
    created_at: column.text,
  },
  { indexes: { patient: ["patient_id"] } },
);

const feedback = new Table(
  {
    patient_id: column.text,
    camp_id: column.text,
    rating: column.integer,
    comments: column.text,
    created_at: column.text,
  },
  { indexes: { camp: ["camp_id"] } },
);

const notifications = new Table({
  user_id: column.text,
  title: column.text,
  message: column.text,
  read: column.integer, // 0 | 1
  type: column.text,
  created_at: column.text,
});

const audit_logs = new Table({
  user_id: column.text,
  action: column.text,
  details: column.text,
  timestamp: column.text,
});

// ── Export combined schema ──────────────────────────────────────────────

export const AppSchema = new Schema({
  roles,
  users,
  camps,
  patients,
  families,
  health_cards,
  vitals,
  prescriptions,
  prescription_medicines,
  medicines,
  medicine_categories,
  diseases,
  allergies,
  inventory,
  medicine_transactions,
  doctor_notes,
  follow_ups,
  feedback,
  notifications,
  audit_logs,
});

export type Database = typeof AppSchema;
