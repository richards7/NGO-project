/**
 * Reactive hook for prescriptions — reads from local SQLite with JOINs.
 */
import { useQuery } from "@powersync/react";

export interface LocalPrescription {
  id: string;
  doctor_id: string;
  patient_id: string;
  camp_id: string;
  advice: string | null;
  created_at: string;
  updated_at: string;
  doctor_name: string | null;
}

export interface LocalPrescriptionMedicine {
  id: string;
  prescription_id: string;
  medicine_id: string;
  dosage: string;
  frequency: string;
  duration: string;
  medicine_name: string | null;
  category_name: string | null;
  stock: number | null;
}

/** Get prescriptions for a patient */
export function usePrescriptions(patientId: string | undefined) {
  return useQuery<LocalPrescription>(
    patientId
      ? `SELECT p.*, u.name as doctor_name
         FROM prescriptions p
         LEFT JOIN users u ON p.doctor_id = u.id
         WHERE p.patient_id = ?
         ORDER BY p.created_at DESC`
      : `SELECT p.*, u.name as doctor_name
         FROM prescriptions p
         LEFT JOIN users u ON p.doctor_id = u.id
         WHERE 0`,
    patientId ? [patientId] : [],
  );
}

/** Get medicine lines for a prescription */
export function usePrescriptionMedicines(prescriptionId: string | undefined) {
  return useQuery<LocalPrescriptionMedicine>(
    prescriptionId
      ? `SELECT pm.*, m.name as medicine_name, mc.name as category_name, m.stock
         FROM prescription_medicines pm
         LEFT JOIN medicines m ON pm.medicine_id = m.id
         LEFT JOIN medicine_categories mc ON m.category_id = mc.id
         WHERE pm.prescription_id = ?`
      : `SELECT pm.*, m.name as medicine_name, mc.name as category_name, m.stock
         FROM prescription_medicines pm
         LEFT JOIN medicines m ON pm.medicine_id = m.id
         LEFT JOIN medicine_categories mc ON m.category_id = mc.id
         WHERE 0`,
    prescriptionId ? [prescriptionId] : [],
  );
}

/** Get camps */
export function useCamps() {
  return useQuery<{
    id: string;
    camp_code: string;
    name: string;
    location: string;
    date: string;
    status: string;
    created_at: string;
    updated_at: string;
  }>(`SELECT * FROM camps ORDER BY date DESC`);
}
