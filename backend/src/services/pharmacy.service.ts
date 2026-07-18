import { getDb } from "../config/database";
import { AppError } from "../utils/app-error";
import { logger } from "../utils/logger";

export class PharmacyService {
  async dispense(prescriptionId: string, campId: string, userId: string) {
    const db = getDb();
    const prescription = await db.prescription.findUnique({
      where: { id: prescriptionId },
      include: { medicines: { include: { medicine: true } } },
    });

    if (!prescription) throw AppError.notFound("Prescription not found");

    // Deduct stock for each medicine
    for (const item of prescription.medicines) {
      const medicine = item.medicine;

      if (medicine.stock < 1) {
        throw AppError.badRequest(`Out of stock: ${medicine.name}`);
      }

      // Decrease global stock
      await db.medicine.update({
        where: { id: medicine.id },
        data: { stock: { decrement: 1 } },
      });

      // Decrease camp inventory
      await db.inventory.updateMany({
        where: { campId, medicineId: medicine.id },
        data: { quantity: { decrement: 1 } },
      });

      // Record transaction
      await db.medicineTransaction.create({
        data: {
          medicineId: medicine.id,
          campId,
          quantity: -1,
          type: "DISPENSED",
          userId,
        },
      });
    }

    // Update patient status
    await db.patient.update({
      where: { id: prescription.patientId },
      data: { status: "Completed" },
    });

    logger.info(`Dispensed prescription ${prescriptionId}`);
    return { message: "Medicines dispensed successfully" };
  }

  async getMedicines(search?: string) {
    const db = getDb();
    const where = search
      ? { name: { contains: search, mode: "insensitive" as const } }
      : {};

    return db.medicine.findMany({
      where,
      include: { category: true },
      orderBy: { name: "asc" },
    });
  }

  async getLowStockAlerts() {
    const db = getDb();
    const all = await db.medicine.findMany({
      include: { category: true },
    });
    return all.filter((m: any) => m.stock <= m.alertLevel);
  }

  async getExpiringMedicines(daysAhead = 90) {
    const db = getDb();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + daysAhead);

    return db.medicine.findMany({
      where: { expiryDate: { lte: cutoff } },
      include: { category: true },
      orderBy: { expiryDate: "asc" },
    });
  }

  async getTransactionHistory(medicineId?: string, campId?: string) {
    const db = getDb();
    const where: Record<string, unknown> = {};
    if (medicineId) where.medicineId = medicineId;
    if (campId) where.campId = campId;

    return db.medicineTransaction.findMany({
      where,
      include: { medicine: true, user: true, camp: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async addStock(medicineId: string, quantity: number, campId: string, userId: string) {
    const db = getDb();
    await db.medicine.update({
      where: { id: medicineId },
      data: { stock: { increment: quantity } },
    });

    await db.inventory.upsert({
      where: { campId_medicineId: { campId, medicineId } },
      update: { quantity: { increment: quantity } },
      create: { campId, medicineId, quantity },
    });

    await db.medicineTransaction.create({
      data: { medicineId, campId, quantity, type: "IN", userId },
    });

    return { message: `Added ${quantity} units` };
  }

  async getCampInventory(campId: string) {
    const db = getDb();
    return db.inventory.findMany({
      where: { campId },
      include: { medicine: { include: { category: true } } },
    });
  }
}
