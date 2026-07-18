import { getDb } from "../config/database";

export class AnalyticsService {
  async getDashboardSummary(campId?: string) {
    const db = getDb();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalPatients,
      patientsToday,
      activeCamps,
      totalCamps,
      totalPrescriptions,
      totalMedicinesDispensed,
      totalConsultations,
      completedPatients,
    ] = await Promise.all([
      db.patient.count(),
      db.patient.count({ where: { createdAt: { gte: today } } }),
      db.camp.count({ where: { status: "Active" } }),
      db.camp.count(),
      db.prescription.count(),
      db.medicineTransaction.count({ where: { type: "DISPENSED" } }),
      db.doctorNote.count(),
      db.patient.count({ where: { status: "Completed" } }),
    ]);

    // Inventory summary
    const medicines = await db.medicine.findMany();
    const totalStock = medicines.reduce((sum, m) => sum + m.stock, 0);
    const lowStockCount = medicines.filter(m => m.stock <= m.alertLevel).length;

    return {
      totalPatients,
      patientsToday,
      activeCamps,
      totalCamps,
      totalPrescriptions,
      totalMedicinesDispensed,
      totalConsultations,
      completedPatients,
      totalStock,
      lowStockCount,
    };
  }

  async getDiseaseDistribution() {
    const db = getDb();
    const data = await db.doctorNote.groupBy({
      by: ["diagnosis"],
      _count: { diagnosis: true },
      orderBy: { _count: { diagnosis: "desc" } },
      take: 10,
    });

    return data.map((d) => ({ name: d.diagnosis, count: d._count.diagnosis }));
  }

  async getGenderDistribution() {
    const db = getDb();
    const data = await db.patient.groupBy({
      by: ["gender"],
      _count: { gender: true },
    });

    return data.map((d) => ({ gender: d.gender, count: d._count.gender }));
  }

  async getAgeDistribution() {
    const db = getDb();
    const patients = await db.patient.findMany({ select: { age: true } });

    const bands: Record<string, number> = {
      "0-12": 0, "13-25": 0, "26-45": 0, "46-60": 0, "60+": 0,
    };

    for (const p of patients) {
      if (p.age <= 12) bands["0-12"]++;
      else if (p.age <= 25) bands["13-25"]++;
      else if (p.age <= 45) bands["26-45"]++;
      else if (p.age <= 60) bands["46-60"]++;
      else bands["60+"]++;
    }

    return Object.entries(bands).map(([band, count]) => ({ band, count }));
  }

  async getMostPrescribedMedicines() {
    const db = getDb();
    const data = await db.prescriptionMedicine.groupBy({
      by: ["medicineId"],
      _count: { medicineId: true },
      orderBy: { _count: { medicineId: "desc" } },
      take: 10,
    });

    const result = await Promise.all(
      data.map(async (d) => {
        const med = await db.medicine.findUnique({ where: { id: d.medicineId } });
        return { medicine: med?.name ?? "Unknown", count: d._count.medicineId };
      }),
    );

    return result;
  }

  async getInventoryStatus() {
    const db = getDb();
    const medicines = await db.medicine.findMany({
      include: { category: true },
      orderBy: { stock: "asc" },
    });

    return medicines.map((m) => ({
      id: m.id,
      name: m.name,
      category: m.category.name,
      stock: m.stock,
      alertLevel: m.alertLevel,
      isLow: m.stock <= m.alertLevel,
      expiryDate: m.expiryDate,
      isExpiringSoon: m.expiryDate <= new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    }));
  }

  async getPatientsPerCamp() {
    const db = getDb();
    const camps = await db.camp.findMany({
      include: { _count: { select: { prescriptions: true } } },
      orderBy: { date: "desc" },
    });

    return camps.map((c) => ({
      campCode: c.campCode,
      name: c.name,
      location: c.location,
      date: c.date,
      patients: c._count.prescriptions,
    }));
  }

  async getDoctorPerformance() {
    const db = getDb();
    const data = await db.prescription.groupBy({
      by: ["doctorId"],
      _count: { id: true },
    });

    const result = await Promise.all(
      data.map(async (d) => {
        const doctor = await db.user.findUnique({ where: { id: d.doctorId } });
        return { doctorName: doctor?.name ?? "Unknown", prescriptions: d._count.id };
      }),
    );

    return result.sort((a, b) => b.prescriptions - a.prescriptions);
  }

  async getFeedbackAnalytics() {
    const db = getDb();
    const feedback = await db.feedback.findMany();
    const total = feedback.length;

    if (total === 0) return { avgRating: 0, total: 0, distribution: {} };

    const avg = parseFloat((feedback.reduce((s, f) => s + f.rating, 0) / total).toFixed(2));

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const f of feedback) distribution[f.rating] = (distribution[f.rating] ?? 0) + 1;

    return { avgRating: avg, total, distribution };
  }

  async getAllFeedback(page = 1, limit = 50, search?: string) {
    const db = getDb();
    const where = search
      ? {
          OR: [
            { patient: { name: { contains: search, mode: "insensitive" as const } } },
            { comments: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [feedback, total] = await Promise.all([
      db.feedback.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          patient: { select: { name: true, token: true } },
          camp: { select: { name: true, campCode: true } },
        },
      }),
      db.feedback.count({ where }),
    ]);

    return { feedback, total };
  }
}
