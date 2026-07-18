import { getDb } from "../config/database";
import { AppError } from "../utils/app-error";
import type { CreatePatientDTO, UpdatePatientDTO, CaptureVitalsDTO, CreateFamilyDTO } from "../dtos/patient.dto";
import { appendPatientToCSV } from "../utils/csv";

interface TriageResult {
  priority: "highest" | "high" | "medium" | "normal";
  reason: string;
}

export class PatientService {
  private tokenCounter = 0;

  async create(dto: CreatePatientDTO, campId?: string) {
    const db = getDb();
    // Get the current max token number to avoid collisions
    const lastPatient = await db.patient.findFirst({
      where: { token: { not: null } },
      orderBy: { createdAt: "desc" },
    });
    if (lastPatient?.token) {
      const num = parseInt(lastPatient.token.replace("T-", ""), 10);
      if (!isNaN(num) && num >= this.tokenCounter) this.tokenCounter = num;
    }
    this.tokenCounter++;
    const token = `T-${String(this.tokenCounter).padStart(3, "0")}`;

    const patient = await db.patient.create({
      data: { ...dto, token, status: "Registered" },
      include: { family: true, vitals: true },
    });

    appendPatientToCSV(patient);

    return patient;
  }

  async findAll(page = 1, limit = 20, search?: string) {
    const db = getDb();
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { token: { contains: search, mode: "insensitive" as const } },
            { village: { contains: search, mode: "insensitive" as const } },
            { phone: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [patients, total] = await Promise.all([
      db.patient.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { vitals: { orderBy: { createdAt: "desc" }, take: 1 }, family: true },
      }),
      db.patient.count({ where }),
    ]);

    return { patients, total };
  }

  async findById(id: string) {
    const db = getDb();
    const patient = await db.patient.findUnique({
      where: { id },
      include: {
        vitals: { orderBy: { createdAt: "desc" } },
        prescriptions: { include: { medicines: { include: { medicine: true } }, doctor: true, doctorNotes: true } },
        followUps: true,
        diseases: true,
        allergies: true,
        family: true,
        feedback: true,
      },
    });
    if (!patient) throw AppError.notFound("Patient not found");
    return patient;
  }

  async update(id: string, dto: UpdatePatientDTO) {
    const db = getDb();
    await this.findById(id);
    return db.patient.update({ where: { id }, data: dto });
  }

  async updateStatus(id: string, status: string) {
    const db = getDb();
    return db.patient.update({ where: { id }, data: { status } });
  }

  // ─── Triage Priority Calculation ─────────────────────────────────────────
  calculatePriority(vitals: CaptureVitalsDTO, patientAge: number): TriageResult {
    const db = getDb();
    const reasons: string[] = [];

    // Parse BP
    const [systolic, diastolic] = vitals.bp.split("/").map(Number);

    // Highest priority
    if (vitals.emergencyCondition) {
      return { priority: "highest", reason: "Emergency condition" };
    }

    // High priority checks
    if (vitals.pregnancyStatus === "pregnant") {
      reasons.push("Pregnant");
    }
    if (systolic > 180 || diastolic > 120) {
      reasons.push("Hypertensive crisis (BP > 180/120)");
    }
    if (systolic < 90 || diastolic < 60) {
      reasons.push("Hypotension (BP < 90/60)");
    }
    if (vitals.temp > 102) {
      reasons.push("High fever (>102°F)");
    }
    if (vitals.spo2 < 90) {
      reasons.push("Low oxygen (<90%)");
    }

    if (reasons.length > 0) {
      return { priority: "high", reason: reasons.join("; ") };
    }

    // Medium priority checks
    if (patientAge > 65) {
      return { priority: "medium", reason: "Senior patient (age >65)" };
    }
    if (patientAge < 5) {
      return { priority: "medium", reason: "Young child (age <5)" };
    }

    return { priority: "normal", reason: "Normal" };
  }

  async captureVitals(dto: CaptureVitalsDTO) {
    const db = getDb();
    const patient = await this.findById(dto.patientId);

    const vitals = await db.vitals.create({
      data: {
        bp: dto.bp,
        sugar: dto.sugar,
        temp: dto.temp,
        pulse: dto.pulse,
        spo2: dto.spo2,
        height: dto.height,
        weight: dto.weight,
        pregnancyStatus: dto.pregnancyStatus,
        emergencyCondition: dto.emergencyCondition ?? false,
        notes: dto.notes,
        patientId: dto.patientId,
      },
    });

    // Connect diseases if provided
    if (dto.diseases && dto.diseases.length > 0) {
      for (const diseaseName of dto.diseases) {
        const disease = await db.disease.upsert({
          where: { name: diseaseName },
          update: {},
          create: { name: diseaseName },
        });
        await db.patient.update({
          where: { id: dto.patientId },
          data: { diseases: { connect: { id: disease.id } } },
        });
      }
    }

    // Connect allergies if provided
    if (dto.allergies && dto.allergies.length > 0) {
      for (const allergyName of dto.allergies) {
        const allergy = await db.allergy.upsert({
          where: { name: allergyName },
          update: {},
          create: { name: allergyName },
        });
        await db.patient.update({
          where: { id: dto.patientId },
          data: { allergies: { connect: { id: allergy.id } } },
        });
      }
    }

    // Calculate triage priority
    const triage = this.calculatePriority(dto, patient.age);

    // Update patient status and queue info
    await db.patient.update({
      where: { id: dto.patientId },
      data: {
        status: "Vitals Captured",
        queuePriority: triage.priority,
        queueReason: triage.reason,
        queuedAt: new Date(),
        priority: triage.priority === "highest" ? "emergency" : "normal",
      },
    });

    return { vitals, triage };
  }

  async updateVitalsByPatient(patientId: string, dto: CaptureVitalsDTO) {
    const db = getDb();
    const patient = await this.findById(patientId);
    if (!patient.vitals || patient.vitals.length === 0) {
      throw AppError.notFound("No vitals found for this patient");
    }
    const latestVitals = patient.vitals[0];

    const vitals = await db.vitals.update({
      where: { id: latestVitals.id },
      data: {
        bp: dto.bp,
        sugar: dto.sugar,
        temp: dto.temp,
        pulse: dto.pulse,
        spo2: dto.spo2,
        height: dto.height,
        weight: dto.weight,
        pregnancyStatus: dto.pregnancyStatus,
        emergencyCondition: dto.emergencyCondition ?? false,
        notes: dto.notes,
      },
    });

    // Recalculate triage priority
    const triage = this.calculatePriority(dto, patient.age);

    // Update patient queue info but keep them in queue
    await db.patient.update({
      where: { id: patientId },
      data: {
        queuePriority: triage.priority,
        queueReason: triage.reason,
        priority: triage.priority === "highest" ? "emergency" : "normal",
      },
    });

    return { vitals, triage };
  }

  async getQueue(campId?: string) {
    const db = getDb();
    const priorityOrder: Record<string, number> = {
      highest: 0,
      high: 1,
      medium: 2,
      normal: 3,
    };

    const patients = await db.patient.findMany({
      where: {
        status: { in: ["Vitals Captured", "Waiting", "In Consultation"] },
      },
      orderBy: [
        { queuedAt: "asc" },
      ],
      include: { vitals: { orderBy: { createdAt: "desc" }, take: 1 } },
    });

    // Sort by priority first (highest to normal), then by queuedAt
    patients.sort((a, b) => {
      const pa = priorityOrder[a.queuePriority] ?? 3;
      const pb = priorityOrder[b.queuePriority] ?? 3;
      if (pa !== pb) return pa - pb;
      const ta = a.queuedAt?.getTime() ?? 0;
      const tb = b.queuedAt?.getTime() ?? 0;
      return ta - tb;
    });

    return patients;
  }

  async getPharmacyQueue() {
    const db = getDb();
    return db.patient.findMany({
      where: {
        status: { in: ["Waiting for Pharmacy", "Completed"] },
      },
      orderBy: { updatedAt: "desc" },
      include: {
        vitals: { orderBy: { createdAt: "desc" }, take: 1 },
        prescriptions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            medicines: { include: { medicine: true } },
            doctor: true,
            doctorNotes: true,
          },
        },
      },
    });
  }

  // ─── Family / Household ────────────────────────────────────────────────────
  async createFamily(dto: CreateFamilyDTO) {
    const db = getDb();
    return db.family.create({ data: dto });
  }

  async findFamilyById(id: string) {
    const db = getDb();
    const family = await db.family.findUnique({
      where: { id },
      include: { patients: true, healthCard: true },
    });
    if (!family) throw AppError.notFound("Family not found");
    return family;
  }

  async searchFamilies(search: string) {
    const db = getDb();
    return db.family.findMany({
      where: { name: { contains: search, mode: "insensitive" } },
      include: { patients: true },
    });
  }

  async getPatientHistory(patientId: string) {
    const db = getDb();
    return db.prescription.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
      include: {
        medicines: { include: { medicine: true } },
        doctorNotes: true,
        doctor: true,
        camp: true,
      },
    });
  }
}
