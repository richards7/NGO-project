/**
 * Reactive hook for prescriptions — reads from local
 */
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";

export interface LocalPrescription {
  id: string;
  doctorId: string;
  patientId: string;
  campId: string;
  advice: string | null;
  createdAt: string;
  updatedAt: string;
  medicines?: Array<{
    id: string;
    medicineId: string;
    medicineName: string;
    dosage: string;
    frequency: string;
    duration: string;
  }>;
}

/** Get prescriptions for a patient */
export function usePrescriptions(patientId: string | undefined) {
  return useQuery({
    queryKey: ["prescriptions", patientId],
    queryFn: async () => {
      if (!patientId) return [];
      const res = await apiRequest(`/patients/${patientId}/history`);
      return (res.data || []) as LocalPrescription[];
    },
    enabled: !!patientId,
  });
}

/** Get medicine lines for a prescription */
export function usePrescriptionMedicines(prescriptionId: string | undefined) {
  return useQuery({
    queryKey: ["prescriptionMedicines", prescriptionId],
    queryFn: async () => {
      if (!prescriptionId) return [];
      const res = await apiRequest(`/prescriptions/${prescriptionId}/medicines`);
      return (res.data || []) as any[];
    },
    enabled: !!prescriptionId,
  });
}

/** Get camps */
export function useCamps() {
  return useQuery({
    queryKey: ["camps"],
    queryFn: async () => {
      const res = await apiRequest("/camps");
      return (res.data || []) as any[];
    },
  });
}
