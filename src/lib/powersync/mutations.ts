/**
 * Offline-capable mutation functions.
 *
 * These write directly to the local PowerSync SQLite database.
 * PowerSync's upload queue automatically syncs them to the Express backend
 * when connectivity is available.
 *
 * All IDs are generated client-side via crypto.randomUUID() so records
 * are immediately usable even without a server round-trip.
 */
import { getDb } from "./db";

// ── Helpers ────────────────────────────────────────────────────────────

function now() {
  return new Date().toISOString();
}

function uuid() {
  return crypto.randomUUID();
}

// ── Patients ───────────────────────────────────────────────────────────

export interface CreatePatientInput {
  name: string;
  age: number;
  gender: string;
  village: string;
  phone?: string;
  priority?: string;
  familyId?: string;
}

export async function createPatient(input: CreatePatientInput) {
  const db = getDb();
  const id = uuid();
  const ts = now();

  // Generate a local token (T-XXXX format)
  const tokenNum = Math.floor(Math.random() * 9000) + 1000;
  const token = `T-${tokenNum}`;

  await db.execute(
    `INSERT INTO patients (id, token, name, age, gender, village, phone, priority, status, queue_priority, queue_reason, queued_at, family_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      token,
      input.name,
      input.age,
      input.gender,
      input.village,
      input.phone ?? null,
      input.priority ?? "normal",
      "Registered",
      "normal",
      null,
      null,
      input.familyId ?? null,
      ts,
      ts,
    ],
  );

  return { id, token };
}

export async function updatePatientStatus(
  patientId: string,
  status: string,
  queuePriority?: string,
  queueReason?: string,
) {
  const db = getDb();
  await db.execute(
    `UPDATE patients SET status = ?, queue_priority = ?, queue_reason = ?, queued_at = ?, updated_at = ? WHERE id = ?`,
    [status, queuePriority ?? "normal", queueReason ?? null, now(), now(), patientId],
  );
}

// ── Vitals ─────────────────────────────────────────────────────────────

export interface CreateVitalsInput {
  patientId: string;
  bp: string;
  sugar: number;
  temp: number;
  pulse: number;
  spo2: number;
  height?: number;
  weight?: number;
  pregnancyStatus?: string;
  emergencyCondition?: boolean;
  notes?: string;
}

export async function createVitals(input: CreateVitalsInput) {
  const db = getDb();
  const id = uuid();
  const ts = now();

  await db.execute(
    `INSERT INTO vitals (id, bp, sugar, temp, pulse, spo2, height, weight, pregnancy_status, emergency_condition, notes, patient_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.bp,
      input.sugar,
      input.temp,
      input.pulse,
      input.spo2,
      input.height ?? null,
      input.weight ?? null,
      input.pregnancyStatus ?? null,
      input.emergencyCondition ? 1 : 0,
      input.notes ?? null,
      input.patientId,
      ts,
    ],
  );

  // Auto-triage: update patient status and queue priority
  let queuePriority = "normal";
  let queueReason: string | undefined = undefined;

  if (input.emergencyCondition) {
    queuePriority = "highest";
    queueReason = "Emergency condition flagged";
  } else if (input.spo2 < 92) {
    queuePriority = "highest";
    queueReason = `Low SpO₂: ${input.spo2}%`;
  } else if (input.sugar > 200) {
    queuePriority = "high";
    queueReason = `High blood sugar: ${input.sugar} mg/dL`;
  } else if (input.temp > 102) {
    queuePriority = "high";
    queueReason = `High temperature: ${input.temp}°F`;
  }

  await updatePatientStatus(input.patientId, "Vitals Captured", queuePriority, queueReason);

  return { id };
}

// ── Prescriptions ──────────────────────────────────────────────────────

export interface PrescriptionMedicineInput {
  medicineId: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export interface CreatePrescriptionInput {
  patientId: string;
  campId: string;
  doctorId: string;
  advice?: string;
  medicines: PrescriptionMedicineInput[];
}

export async function createPrescription(input: CreatePrescriptionInput) {
  const db = getDb();
  const prescriptionId = uuid();
  const ts = now();

  await db.execute(
    `INSERT INTO prescriptions (id, doctor_id, patient_id, camp_id, advice, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [prescriptionId, input.doctorId, input.patientId, input.campId, input.advice ?? null, ts, ts],
  );

  for (const med of input.medicines) {
    await db.execute(
      `INSERT INTO prescription_medicines (id, prescription_id, medicine_id, dosage, frequency, duration)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [uuid(), prescriptionId, med.medicineId, med.dosage, med.frequency, med.duration],
    );
  }

  // Update patient status to "Waiting for Pharmacy"
  await updatePatientStatus(input.patientId, "Waiting for Pharmacy");

  return { id: prescriptionId };
}

// ── Pharmacy ───────────────────────────────────────────────────────────

export async function dispenseMedicine(prescriptionId: string, campId: string, userId: string, quantities?: Record<string, number>) {
  const db = getDb();
  const ts = now();

  // Get prescription medicines
  const meds = await db.getAll<{
    medicine_id: string;
    dosage: string;
  }>(
    "SELECT medicine_id, dosage FROM prescription_medicines WHERE prescription_id = ?",
    [prescriptionId],
  );

  // Create a transaction for each medicine dispensed and decrement stock
  for (const med of meds) {
    const qty = quantities?.[med.medicine_id] ?? 10; // Default to 10 if not provided
    await db.execute(
      `INSERT INTO medicine_transactions (id, medicine_id, camp_id, quantity, type, user_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [uuid(), med.medicine_id, campId, qty, "DISPENSED", userId, ts],
    );

    await db.execute(
      `UPDATE medicines SET stock = stock - ?, updated_at = ? WHERE id = ?`,
      [qty, ts, med.medicine_id]
    );
  }

  // Get the patient id from the prescription
  const rx = await db.get<{ patient_id: string }>(
    "SELECT patient_id FROM prescriptions WHERE id = ?",
    [prescriptionId],
  );

  if (rx) {
    await updatePatientStatus(rx.patient_id, "Completed");
  }
}

export interface CreateMedicineInput {
  name: string;
  categoryId: string;
  batchNumber?: string;
  expiryDate?: string;
  stock: number;
}

export async function createMedicine(input: CreateMedicineInput) {
  const db = getDb();
  const id = uuid();
  const ts = now();

  // Generate a random batch number if not provided
  const batchNumber = input.batchNumber || `B-${Math.floor(Math.random() * 9000) + 1000}`;
  
  // Default expiry date 2 years from now if not provided
  let expiryDate = input.expiryDate;
  if (!expiryDate) {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 2);
    expiryDate = d.toISOString();
  }

  await db.execute(
    `INSERT INTO medicines (id, name, category_id, batch_number, expiry_date, stock, alert_level, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, input.name, input.categoryId, batchNumber, expiryDate, input.stock, 50, ts, ts],
  );

  return { id };
}

// ── Feedback ───────────────────────────────────────────────────────────

export interface CreateFeedbackInput {
  patientId: string;
  campId: string;
  rating: number;
  comments?: string;
}

export async function createFeedback(input: CreateFeedbackInput) {
  const db = getDb();
  const id = uuid();
  await db.execute(
    `INSERT INTO feedback (id, patient_id, camp_id, rating, comments, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, input.patientId, input.campId, input.rating, input.comments ?? null, now()],
  );
  return { id };
}

// ── Camps ──────────────────────────────────────────────────────────────

export interface CreateCampInput {
  name: string;
  location: string;
  date: string;
  campCode?: string;
}

export async function createCamp(input: CreateCampInput) {
  const db = getDb();
  const id = uuid();
  const ts = now();
  const campCode = input.campCode ?? `C-${Math.floor(Math.random() * 9000) + 1000}`;

  await db.execute(
    `INSERT INTO camps (id, camp_code, name, location, date, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, campCode, input.name, input.location, input.date, "Scheduled", ts, ts],
  );

  return { id, campCode };
}
