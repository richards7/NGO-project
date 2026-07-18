import { Router } from "express";
import { conflictResolver } from "../services/conflict-resolver";
import { logger } from "../utils/logger";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// Ingest batch from local camp server
router.post("/ingest", async (req, res) => {
  try {
    // Basic auth check for Camp Servers pushing to Cloud
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.split(" ")[1] !== (process.env.CAMP_SECRET || "offline_camp_secret_123")) {
      return res.status(401).json({ message: "Unauthorized Camp Server" });
    }

    const { table, records } = req.body;
    
    if (!table || !Array.isArray(records)) {
      return res.status(400).json({ message: "Invalid payload format. Expected { table, records: [] }" });
    }

    logger.info(`[SyncCloud] Ingesting ${records.length} records for table ${table}`);
    
    const results = await conflictResolver.ingestBatchLWW(table, records);
    
    return res.status(200).json({
      message: "Batch ingested successfully",
      ...results
    });
  } catch (error: any) {
    logger.error("[SyncCloud] Ingest error:", error);
    return res.status(500).json({ message: "Ingest failed", error: error.message });
  }
});

// Pull updates from cloud to local camp server
router.get("/pull", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.split(" ")[1] !== (process.env.CAMP_SECRET || "offline_camp_secret_123")) {
      return res.status(401).json({ message: "Unauthorized Camp Server" });
    }

    const sinceStr = req.query.since as string;
    const sinceDate = sinceStr ? new Date(sinceStr) : new Date(0);
    
    logger.info(`[SyncCloud] Pull request since ${sinceDate.toISOString()}`);
    
    const timestamp = new Date().toISOString();
    
    // We only pull data that's relevant.
    // For simplicity, we query all tables for rows where updatedAt > sinceDate
    // In a real production system, this could be optimized or batched by table.
    
    // Using Prisma to query. We have to map tables to Prisma models.
    const models = [
      "user", "role", "permission", "camp", "medicineCategory", "medicine",
      "family", "healthCard", "patient", "vitals", "disease", "allergy",
      "inventory", "medicineTransaction", "prescription", "prescriptionMedicine",
      "doctorNote", "followUp", "feedback", "auditLog", "report", "notification"
    ];

    const data: Record<string, any[]> = {};

    for (const model of models) {
      const delegate = (prisma as any)[model];
      if (!delegate) continue;

      const records = await delegate.findMany({
        where: {
          updatedAt: {
            gt: sinceDate
          }
        }
      });
      
      if (records.length > 0) {
        // Find the actual DB table name. In sqlite-adapter MODELS, we had the exact table names.
        // For simplicity, we can return them using the model name, but cloud-sync.service expects table names.
        // Let's use Prisma.ModelName to get the table name if possible, or just use our standard mapping.
        // Actually, cloud-sync.service uses table names like 'users', 'roles', 'patients'.
        const tableName = getTableNameFromModel(model);
        data[tableName] = records;
      }
    }

    return res.status(200).json({
      message: "Pull success",
      timestamp,
      data
    });
  } catch (error: any) {
    logger.error("[SyncCloud] Pull error:", error);
    return res.status(500).json({ message: "Pull failed", error: error.message });
  }
});

// Utility mapping to match sqlite-adapter MODELS table names
function getTableNameFromModel(model: string): string {
  const map: Record<string, string> = {
    user: "users",
    role: "roles",
    permission: "permissions",
    camp: "camps",
    patient: "patients",
    family: "families",
    healthCard: "health_cards",
    vitals: "vitals",
    disease: "diseases",
    allergy: "allergies",
    prescription: "prescriptions",
    prescriptionMedicine: "prescription_medicines",
    medicine: "medicines",
    medicineCategory: "medicine_categories",
    inventory: "inventory",
    medicineTransaction: "medicine_transactions",
    doctorNote: "doctor_notes",
    followUp: "follow_ups",
    feedback: "feedback",
    notification: "notifications",
    auditLog: "audit_logs",
    report: "reports"
  };
  return map[model] || model;
}

export default router;
