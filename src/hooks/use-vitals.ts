/**
 * Reactive hook for vitals — reads from local SQLite.
 */
import { useQuery } from "@powersync/react";

export interface LocalVitals {
  id: string;
  bp: string;
  sugar: number;
  temp: number;
  pulse: number;
  spo2: number;
  height: number | null;
  weight: number | null;
  pregnancy_status: string | null;
  emergency_condition: number; // 0 | 1
  notes: string | null;
  patient_id: string;
  created_at: string;
}

/** Get vitals for a specific patient (latest first) */
export function useVitals(patientId: string | undefined) {
  return useQuery<LocalVitals>(
    patientId
      ? `SELECT * FROM vitals WHERE patient_id = ? ORDER BY created_at DESC`
      : `SELECT * FROM vitals WHERE 0`,
    patientId ? [patientId] : [],
  );
}
