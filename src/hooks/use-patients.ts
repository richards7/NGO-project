import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";

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
  queuePriority: string;
  queueReason: string | null;
  queuedAt: string | null;
  familyId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** All patients, newest first */
export function usePatients(search?: string) {
  return useQuery({
    queryKey: ["patients", search],
    queryFn: async () => {
      const qs = search ? `?search=${encodeURIComponent(search)}` : "";
      const res = await apiRequest(`/patients${qs}`);
      return (res.data || []) as LocalPatient[];
    },
  });
}

/** Single patient by ID, with their vitals */
export function usePatient(patientId: string | undefined) {
  const query = useQuery({
    queryKey: ["patient", patientId],
    queryFn: async () => {
      if (!patientId) return null;
      const res = await apiRequest(`/patients/${patientId}`);
      return (res.data || null) as LocalPatient | null;
    },
    enabled: !!patientId,
  });

  return {
    patient: query.data ?? null,
    isLoading: query.isLoading,
  };
}

/** Patients with a specific status */
export function usePatientsByStatus(status: string) {
  return useQuery({
    queryKey: ["patients", "status", status],
    queryFn: async () => {
      const res = await apiRequest(`/patients?status=${encodeURIComponent(status)}`);
      return (res.data || []) as LocalPatient[];
    },
  });
}
