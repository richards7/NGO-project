/**
 * Reactive hook for patients — reads from local SQLite.
 */
import { useQuery } from "@powersync/react";

export interface LocalPatient {
  id: string;
  token: string | null;
  name: string;
  age: number;
  gender: string;
  village: string;
  phone: string | null;
  priority: string;
  status: string;
  queue_priority: string;
  queue_reason: string | null;
  queued_at: string | null;
  family_id: string | null;
  created_at: string;
  updated_at: string;
}

/** All patients, newest first */
export function usePatients(search?: string) {
  const query = search
    ? `SELECT * FROM patients WHERE name LIKE ? OR token LIKE ? OR phone LIKE ? ORDER BY created_at DESC`
    : `SELECT * FROM patients ORDER BY created_at DESC`;

  const params = search ? [`%${search}%`, `%${search}%`, `%${search}%`] : [];

  return useQuery<LocalPatient>(query, params);
}

/** Single patient by ID, with their vitals */
export function usePatient(patientId: string | undefined) {
  const patientResult = useQuery<LocalPatient>(
    patientId ? `SELECT * FROM patients WHERE id = ?` : `SELECT * FROM patients WHERE 0`,
    patientId ? [patientId] : [],
  );

  return {
    patient: patientResult.data?.[0] ?? null,
    isLoading: patientResult.isLoading,
  };
}

/** Patients with a specific status */
export function usePatientsByStatus(status: string) {
  return useQuery<LocalPatient>(
    `SELECT * FROM patients WHERE status = ? ORDER BY queued_at ASC`,
    [status],
  );
}
