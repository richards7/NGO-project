import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";

export interface LocalVitals {
  id: string;
  bp: string;
  sugar: number;
  temp: number;
  pulse: number;
  spo2: number;
  height: number | null;
  weight: number | null;
  pregnancyStatus: string | null;
  emergencyCondition: number; // 0 | 1
  notes: string | null;
  patientId: string;
  createdAt: string;
}

/** Get vitals for a specific patient (latest first) */
export function useVitals(patientId: string | undefined) {
  return useQuery({
    queryKey: ["vitals", patientId],
    queryFn: async () => {
      if (!patientId) return [];
      const res = await apiRequest(`/patients/${patientId}/vitals`);
      return (res.data || []) as LocalVitals[];
    },
    enabled: !!patientId,
  });
}
