/**
 * Reactive hook for the Smart Queue — reads from local SQLite.
 * Replicates the backend's priority-based queue sorting locally.
 */
import { useQuery } from "@powersync/react";
import type { LocalPatient } from "./use-patients";

/**
 * Returns patients currently in the queue (not yet completed),
 * sorted by queue priority (highest → normal) and queued time.
 */
export function useQueue() {
  return useQuery<LocalPatient>(
    `SELECT * FROM patients
     WHERE status IN ('Vitals Captured', 'In Consultation')
     ORDER BY
       CASE queue_priority
         WHEN 'highest' THEN 1
         WHEN 'high'    THEN 2
         WHEN 'medium'  THEN 3
         WHEN 'normal'  THEN 4
         ELSE 5
       END ASC,
       queued_at ASC`,
  );
}

/**
 * Returns patients waiting for pharmacy (prescription sent but not dispensed).
 */
export function usePharmacyQueue() {
  return useQuery<LocalPatient>(
    `SELECT * FROM patients
     WHERE status = 'Waiting for Pharmacy'
     ORDER BY updated_at DESC`,
  );
}
