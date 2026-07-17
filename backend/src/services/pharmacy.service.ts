import prisma from "../config/database";
import { AppError } from "../utils/app-error";
import { logger } from "../utils/logger";

export class PharmacyService {
  async dispense(prescriptionId: string, campId: string, userId: string) {
    const prescription = await prisma.prescription.findUnique({
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
      await prisma.medicine.update({
        where: { id: medicine.id },
        data: { stock: { decrement: 1 } },
      });

      // Decrease camp inventory
      await prisma.inventory.updateMany({
        where: { campId, medicineId: medicine.id },
        data: { quantity: { decrement: 1 } },
      });

      // Record transaction
      await prisma.medicineTransaction.create({
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
    await prisma.patient.update({
      where: { id: prescription.patientId },
      data: { status: "Completed" },
    });

    logger.info(`Dispensed prescription ${prescriptionId}`);
    return { message: "Medicines dispensed successfully" };
  }

  async getMedicines(search?: string) {
    const where = search
      ? { name: { contains: search, mode: "insensitive" as const } }
      : {};

    return prisma.medicine.findMany({
      where,
      include: { category: true },
      orderBy: { name: "asc" },
    });
  }

  async getLowStockAlerts() {
    return prisma.medicine.findMany({
      where: { stock: { lte: prisma.medicine.fields.alertLevel } },
      include: { category: true },
    });
  }

  async getExpiringMedicines(daysAhead = 90) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + daysAhead);

    return prisma.medicine.findMany({
      where: { expiryDate: { lte: cutoff } },
      include: { category: true },
      orderBy: { expiryDate: "asc" },
    });
  }

  async getTransactionHistory(medicineId?: string, campId?: string) {
    const where: Record<string, unknown> = {};
    if (medicineId) where.medicineId = medicineId;
    if (campId) where.campId = campId;

    return prisma.medicineTransaction.findMany({
      where,
      include: { medicine: true, user: true, camp: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async addStock(medicineId: string, quantity: number, campId: string, userId: string) {
    await prisma.medicine.update({
      where: { id: medicineId },
      data: { stock: { increment: quantity } },
    });

    await prisma.inventory.upsert({
      where: { campId_medicineId: { campId, medicineId } },
      update: { quantity: { increment: quantity } },
      create: { campId, medicineId, quantity },
    });

    await prisma.medicineTransaction.create({
      data: { medicineId, campId, quantity, type: "IN", userId },
    });

    return { message: `Added ${quantity} units` };
  }

  async getCampInventory(campId: string) {
    return prisma.inventory.findMany({
      where: { campId },
      include: { medicine: { include: { category: true } } },
    });
  }
}
