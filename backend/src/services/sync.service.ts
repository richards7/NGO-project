import { getDb } from "../config/database";
import { logger } from "../utils/logger";

interface CrudEntry {
  op: "PUT" | "PATCH" | "DELETE";
  table: string;
  id: string;
  opData?: Record<string, any>;
}

/**
 * Convert snake_case to camelCase
 */
function toCamel(obj: Record<string, any>): Record<string, any> {
  if (!obj) return {};
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    result[camelKey] = value;
  }
  return result;
}

export class SyncService {
  /**
   * Process a PowerSync CRUD batch.
   * PowerSync sends local SQLite mutations as an array of operations.
   */
  async processPowerSyncBatch(batches: CrudEntry[], userId: string) {
    const db = getDb();
    logger.info(`Processing PowerSync batch of ${batches.length} operations for user ${userId}`);

    for (const entry of batches) {
      try {
        await this.processEntry(entry, userId);
      } catch (err: any) {
        logger.error(`Error processing PowerSync entry: ${err.message}`, entry);
        // We throw so the PowerSync client knows the batch failed and can retry or halt
        throw err;
      }
    }

    return { success: true };
  }

  private async processEntry(entry: CrudEntry, userId: string) {
    const db = getDb();
    const { op, table, id, opData } = entry;
    const data = opData ? toCamel(opData) : {};

    // PowerSync tables map to Prisma models
    switch (table) {
      case "patients":
        if (op === "PUT" || op === "PATCH") {
          await db.patient.upsert({
            where: { id },
            update: data,
            create: {
              id,
              name: data.name,
              age: data.age,
              gender: data.gender,
              village: data.village,
              phone: data.phone,
              priority: data.priority ?? "normal",
              status: data.status ?? "Registered",
              token: data.token,
              queuePriority: data.queuePriority,
              queueReason: data.queueReason,
              queuedAt: data.queuedAt ? new Date(data.queuedAt) : null,
              createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
              updatedAt: new Date(),
            },
          });
        } else if (op === "DELETE") {
          await db.patient.delete({ where: { id } }).catch(() => {});
        }
        break;

      case "vitals":
        if (op === "PUT" || op === "PATCH") {
          await db.vitals.upsert({
            where: { id },
            update: data,
            create: {
              id,
              bp: data.bp,
              sugar: data.sugar,
              temp: data.temp,
              pulse: data.pulse,
              spo2: data.spo2,
              height: data.height,
              weight: data.weight,
              pregnancyStatus: data.pregnancyStatus,
              emergencyCondition: data.emergencyCondition === 1,
              notes: data.notes,
              patientId: data.patientId,
              createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
            },
          });
        } else if (op === "DELETE") {
          await db.vitals.delete({ where: { id } }).catch(() => {});
        }
        break;

      case "prescriptions":
        if (op === "PUT" || op === "PATCH") {
          await db.prescription.upsert({
            where: { id },
            update: data,
            create: {
              id,
              doctorId: data.doctorId,
              patientId: data.patientId,
              campId: data.campId,
              advice: data.advice,
              qrImage: data.qrImage,
              pdfPath: data.pdfPath,
              createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
              updatedAt: new Date(),
            },
          });
        } else if (op === "DELETE") {
          await db.prescription.delete({ where: { id } }).catch(() => {});
        }
        break;

      case "prescription_medicines":
        if (op === "PUT" || op === "PATCH") {
          await db.prescriptionMedicine.upsert({
            where: { id },
            update: data,
            create: {
              id,
              prescriptionId: data.prescriptionId,
              medicineId: data.medicineId,
              dosage: data.dosage,
              frequency: data.frequency,
              duration: data.duration,
            },
          });
        } else if (op === "DELETE") {
          await db.prescriptionMedicine.delete({ where: { id } }).catch(() => {});
        }
        break;

      case "camps":
        if (op === "PUT" || op === "PATCH") {
          await db.camp.upsert({
            where: { id },
            update: data,
            create: {
              id,
              campCode: data.campCode,
              name: data.name,
              location: data.location,
              date: data.date ? new Date(data.date) : new Date(),
              status: data.status,
              createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
              updatedAt: new Date(),
            },
          });
        }
        break;

      case "feedback":
        if (op === "PUT") {
          await db.feedback.upsert({
            where: { id },
            update: data,
            create: {
              id,
              patientId: data.patientId,
              campId: data.campId,
              rating: data.rating,
              comments: data.comments,
              createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
            },
          });
        }
        break;

      case "medicine_transactions":
        if (op === "PUT") {
          await db.medicineTransaction.upsert({
            where: { id },
            update: {},
            create: {
              id,
              medicineId: data.medicineId,
              campId: data.campId,
              quantity: data.quantity,
              type: data.type,
              userId: data.userId,
              createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
            },
          });
        }
        break;

      case "medicines":
        if (op === "PUT" || op === "PATCH") {
          await db.medicine.upsert({
            where: { id },
            update: {
              name: data.name,
              categoryId: data.categoryId,
              batchNumber: data.batchNumber,
              expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
              stock: data.stock,
              alertLevel: data.alertLevel,
            },
            create: {
              id,
              name: data.name,
              categoryId: data.categoryId,
              batchNumber: data.batchNumber || "UNKNOWN",
              expiryDate: data.expiryDate ? new Date(data.expiryDate) : new Date(),
              stock: data.stock || 0,
              alertLevel: data.alertLevel || 50,
              createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
              updatedAt: new Date(),
            },
          });
        } else if (op === "DELETE") {
          await db.medicine.delete({ where: { id } }).catch(() => {});
        }
        break;

      case "medicine_categories":
        if (op === "PUT" || op === "PATCH") {
          await db.medicineCategory.upsert({
            where: { id },
            update: {
              name: data.name,
              description: data.description,
            },
            create: {
              id,
              name: data.name,
              description: data.description,
            },
          });
        }
        break;

      default:
        logger.warn(`PowerSync upload: Unhandled table '${table}'`);
        break;
    }
  }

  // Legacy pull method — unused by PowerSync, but kept for compatibility if needed.
  async pull() {
    const db = getDb();
    return { changes: {}, serverTimestamp: new Date().toISOString() };
  }
}
