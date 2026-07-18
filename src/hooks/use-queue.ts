import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import type { LocalPatient } from "./use-patients";

/**
 * Returns patients currently in the queue (not yet completed),
 * sorted by queue priority (highest → normal) and queued time.
 */
export function useQueue() {
  return useQuery({
    queryKey: ["queue"],
    queryFn: async () => {
      const res = await apiRequest("/patients/queue");
      return (res.data || []) as LocalPatient[];
    },
  });
}

/**
 * Returns patients waiting for pharmacy (prescription sent but not dispensed).
 */
export function usePharmacyQueue() {
  return useQuery({
    queryKey: ["pharmacyQueue"],
    queryFn: async () => {
      const res = await apiRequest("/patients/pharmacy-queue");
      return (res.data || []) as LocalPatient[];
    },
  });
}
