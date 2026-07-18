import { getDb } from "../config/database";

interface PredictionInput {
  location: string;
  season: "summer" | "monsoon" | "winter" | "spring";
  expectedPatients?: number;
  pastCampIds?: string[];
}

interface MedicineRecommendation {
  medicineId: string;
  medicineName: string;
  recommendedStock: number;
  confidence: number; // 0.0 to 1.0
}

interface PredictionOutput {
  expectedPatients: number;
  recommendedStock: MedicineRecommendation[];
  predictionConfidence: number;
  generatedAt: string;
}

// Seasonal demand multipliers
const SEASON_MULTIPLIERS: Record<string, number> = {
  summer: 1.3,   // More heatstroke, dehydration, skin
  monsoon: 1.5,  // Waterborne diseases, respiratory infections
  winter: 1.2,   // Cold, respiratory
  spring: 1.0,   // Baseline
};

export class PredictionService {
  async predict(input: PredictionInput): Promise<PredictionOutput> {
    const db = getDb();
    const seasonMultiplier = SEASON_MULTIPLIERS[input.season] ?? 1.0;

    // ─── Step 1: Estimate expected patients ──────────────────────────────────
    let expectedPatients = input.expectedPatients ?? 0;

    if (!expectedPatients) {
      // Average patients from past camps in same or similar location
      const pastCamps = await db.camp.findMany({
        where: {
          status: "Completed",
          location: { contains: input.location.split(",")[0], mode: "insensitive" },
        },
        take: 10,
      });

      // Fallback: count prescriptions from completed camps
      const campIds = input.pastCampIds ?? pastCamps.map((c) => c.id);

      if (campIds.length > 0) {
        const counts = await db.prescription.groupBy({
          by: ["campId"],
          _count: { id: true },
          where: { campId: { in: campIds } },
        });

        const avg =
          counts.reduce((sum, c) => sum + c._count.id, 0) / Math.max(counts.length, 1);
        expectedPatients = Math.ceil(avg * seasonMultiplier);
      } else {
        // Global average fallback
        const total = await db.patient.count();
        const campCount = await db.camp.count({ where: { status: "Completed" } });
        expectedPatients = Math.ceil((total / Math.max(campCount, 1)) * seasonMultiplier);
      }
    }

    // ─── Step 2: Compute medicine recommendation ─────────────────────────────
    const topMedicines = await db.prescriptionMedicine.groupBy({
      by: ["medicineId"],
      _count: { medicineId: true },
      orderBy: { _count: { medicineId: "desc" } },
      take: 15,
    });

    const totalPrescriptions = await db.prescription.count();
    const recommendations: MedicineRecommendation[] = [];

    for (const entry of topMedicines) {
      const medicine = await db.medicine.findUnique({ where: { id: entry.medicineId } });
      if (!medicine) continue;

      // Usage rate: prescriptions containing this medicine / total prescriptions
      const usageRate = totalPrescriptions > 0 ? entry._count.medicineId / totalPrescriptions : 0;

      // Recommended stock = usage rate × expected patients × seasonal multiplier × safety margin (1.2)
      const recommended = Math.ceil(usageRate * expectedPatients * seasonMultiplier * 1.2);

      // Confidence based on data richness
      const confidence = Math.min(0.95, usageRate * 3 + (topMedicines.length > 5 ? 0.3 : 0));

      recommendations.push({
        medicineId: medicine.id,
        medicineName: medicine.name,
        recommendedStock: Math.max(recommended, 10), // minimum 10 units
        confidence: parseFloat(confidence.toFixed(2)),
      });
    }

    const overallConfidence =
      recommendations.length > 0
        ? parseFloat(
            (recommendations.reduce((s, r) => s + r.confidence, 0) / recommendations.length).toFixed(2),
          )
        : 0;

    return {
      expectedPatients,
      recommendedStock: recommendations,
      predictionConfidence: overallConfidence,
      generatedAt: new Date().toISOString(),
    };
  }
}
