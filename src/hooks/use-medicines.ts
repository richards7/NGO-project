/**
 * Reactive hook for medicines — reads from local SQLite.
 */
import { useQuery } from "@powersync/react";

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
  return useQuery<LocalMedicineWithCategory>(
    `SELECT m.*, mc.name as category_name
     FROM medicines m
     LEFT JOIN medicine_categories mc ON m.category_id = mc.id
     ORDER BY m.name ASC`,
  );
}

/** Inventory for a specific camp */
export function useInventory(campId: string | undefined) {
  return useQuery<{
    id: string;
    camp_id: string;
    medicine_id: string;
    quantity: number;
    reserved: number;
    medicine_name: string;
    category_name: string | null;
    alert_level: number;
  }>(
    campId
      ? `SELECT i.*, m.name as medicine_name, mc.name as category_name, m.alert_level
         FROM inventory i
         JOIN medicines m ON i.medicine_id = m.id
         LEFT JOIN medicine_categories mc ON m.category_id = mc.id
         WHERE i.camp_id = ?
         ORDER BY m.name ASC`
      : `SELECT i.*, m.name as medicine_name, mc.name as category_name, m.alert_level
         FROM inventory i
         JOIN medicines m ON i.medicine_id = m.id
         LEFT JOIN medicine_categories mc ON m.category_id = mc.id
         ORDER BY m.name ASC`,
    campId ? [campId] : [],
  );
}
