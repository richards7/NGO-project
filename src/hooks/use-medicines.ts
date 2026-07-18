import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";

export interface LocalMedicine {
  id: string;
  name: string;
  category_id: string;
  batch_number: string;
  expiry_date: string;
  stock: number;
  alert_level: number;
  created_at: string;
  updated_at: string;
}

export interface LocalMedicineWithCategory extends LocalMedicine {
  category_name: string | null;
}

/** All medicines with category names */
export function useMedicines() {
  return useQuery({
    queryKey: ["medicines"],
    queryFn: async () => {
      const res = await apiRequest("/pharmacy/medicines");
      return (res.data || []) as LocalMedicineWithCategory[];
    },
  });
}

/** Inventory for a specific camp */
export function useInventory(campId: string | undefined) {
  return useQuery({
    queryKey: ["inventory", campId],
    queryFn: async () => {
      if (!campId) {
        const res = await apiRequest("/pharmacy/inventory/all"); // Assuming this exists or falls back
        return (res.data || []) as any[];
      }
      const res = await apiRequest(`/pharmacy/inventory/${campId}`);
      return (res.data || []) as any[];
    },
    enabled: true,
  });
}
