/**
 * Offline-capable mutation functions using apiRequest.
 * apiRequest automatically queues requests when offline.
 */
import { apiRequest } from "../api";

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
  const res = await apiRequest("/patients", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.data;
}

export async function updatePatientStatus(
  patientId: string,
  status: string,
  queuePriority?: string,
  queueReason?: string,
) {
  const res = await apiRequest(`/patients/${patientId}`, {
    method: "PATCH",
    body: JSON.stringify({ status, queuePriority, queueReason }),
  });
  return res.data;
}

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
  const res = await apiRequest(`/patients/vitals`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.data;
}

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
  const res = await apiRequest(`/consultation/prescriptions`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.data;
}

export async function dispenseMedicine(prescriptionId: string, campId: string, userId: string, quantities?: Record<string, number>) {
  const res = await apiRequest(`/pharmacy/dispense`, {
    method: "POST",
    body: JSON.stringify({ prescriptionId, campId, quantities }),
  });
  return res.data;
}

export interface CreateMedicineInput {
  name: string;
  categoryId: string;
  batchNumber?: string;
  expiryDate?: string;
  stock: number;
}

export async function createMedicine(input: CreateMedicineInput) {
  const res = await apiRequest(`/pharmacy/medicines`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.data;
}

export interface CreateFeedbackInput {
  patientId: string;
  campId: string;
  rating: number;
  comments?: string;
}

export async function createFeedback(input: CreateFeedbackInput) {
  const res = await apiRequest(`/pharmacy/feedback`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.data;
}

export interface CreateCampInput {
  name: string;
  location: string;
  date: string;
  campCode?: string;
}

export async function createCamp(input: CreateCampInput) {
  const res = await apiRequest(`/camps`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.data;
}
