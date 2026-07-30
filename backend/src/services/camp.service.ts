import { getDb } from "../config/database";
import { AppError } from "../utils/app-error";
import { ExcelSyncService } from "./excel-sync.service";
import type { CreateCampDTO, UpdateCampDTO, CreateFeedbackDTO } from "../dtos/camp.dto";

export class CampService {
  private excelSync = ExcelSyncService.getInstance();

  async create(dto: CreateCampDTO & { ngoId?: string }) {
    const db = getDb();
    
    const year = new Date(dto.startDate).getFullYear() || new Date().getFullYear();
    const prefix = `CMP-${year}-`;
    
    // Get the current max camp code for this year
    const lastCamp = await db.camp.findFirst({
      where: { campCode: { startsWith: prefix } },
      orderBy: { createdAt: "desc" },
    });
    
    let nextNum = 1;
    if (lastCamp?.campCode) {
      const numPart = lastCamp.campCode.split("-")[2];
      const num = parseInt(numPart, 10);
      if (!isNaN(num)) nextNum = num + 1;
    }
    
    const campCode = `${prefix}${String(nextNum).padStart(4, "0")}`;

    // Extract ngoId and build Prisma-compatible data
    const { ngoId, ...rest } = dto;
    const createData: any = {
      ...rest,
      campCode,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
    };
    
    // Use Prisma relation connect pattern for ngoId
    if (ngoId) {
      createData.ngo = { connect: { id: ngoId } };
    }

    const camp = await db.camp.create({ data: createData });

    // Immediately generate the Excel workbook for this camp
    await this.excelSync.syncWorkbook(camp.id);

    return camp;
  }

  async findAll() {
    const db = getDb();
    return db.camp.findMany({
      orderBy: { startDate: "desc" },
      include: { 
        ngo: true,
        patients: true,
        users: { include: { role: true } },
        _count: { select: { prescriptions: true, feedback: true, patients: true } } 
      },
    });
  }

  async findById(id: string) {
    const db = getDb();
    const camp = await db.camp.findUnique({
      where: { id },
      include: {
        inventory: { include: { medicine: true } },
        _count: { select: { prescriptions: true, feedback: true } },
      },
    });
    if (!camp) throw AppError.notFound("Camp not found");
    return camp;
  }

  /**
   * Detailed camp overview — returns all categorized data for the camp overview page.
   */
  async getDetailedOverview(id: string) {
    const db = getDb();

    const [camp, users, patients, inventory, transactions] = await Promise.all([
      db.camp.findUnique({ where: { id } }),
      db.user.findMany({ where: { campId: id }, include: { role: true } }),
      db.patient.findMany({
        where: { campId: id },
        orderBy: { createdAt: "desc" },
        include: {
          vitals: { orderBy: { createdAt: "desc" }, take: 1 },
          prescriptions: {
            include: { medicines: { include: { medicine: true } }, doctor: true, doctorNotes: true },
          },
        },
      }),
      db.inventory.findMany({
        where: { campId: id },
        include: { medicine: { include: { category: true } } },
      }),
      db.medicineTransaction.findMany({
        where: { campId: id },
        include: { medicine: true },
      }),
    ]);

    if (!camp) throw AppError.notFound("Camp not found");

    // Group users by role
    const doctors = users.filter((u: any) => u.role?.name === "doctor").map((u: any) => ({
      id: u.id, name: u.name, email: u.email, createdAt: u.createdAt,
    }));
    const registrationTeam = users.filter((u: any) => u.role?.name === "registration").map((u: any) => ({
      id: u.id, name: u.name, email: u.email, createdAt: u.createdAt,
    }));
    const pharmacyTeam = users.filter((u: any) => u.role?.name === "pharmacy").map((u: any) => ({
      id: u.id, name: u.name, email: u.email, createdAt: u.createdAt,
    }));

    // Patient demographics
    const totalPatients = patients.length;
    const maleCount = patients.filter((p: any) => p.gender?.toLowerCase() === "male").length;
    const femaleCount = patients.filter((p: any) => p.gender?.toLowerCase() === "female").length;
    const childrenCount = patients.filter((p: any) => p.age <= 12).length;
    const seniorCount = patients.filter((p: any) => p.age > 60).length;

    // Medicine inventory with dispensed counts
    const inventoryWithUsage = inventory.map((inv: any) => {
      const dispensedCount = transactions
        .filter((t: any) => t.medicineId === inv.medicineId && t.type === "DISPENSED")
        .reduce((sum: number, t: any) => sum + Math.abs(t.quantity), 0);
      return {
        id: inv.id,
        medicineName: inv.medicine?.name || "Unknown",
        category: inv.medicine?.category?.name || "",
        batchNumber: inv.medicine?.batchNumber || "",
        campStock: inv.quantity + dispensedCount,
        dispensed: dispensedCount,
        remaining: inv.quantity,
      };
    });

    const lastSyncTime = this.excelSync.getLastSyncTime(id);

    return {
      camp: {
        id: camp.id,
        campCode: camp.campCode,
        name: camp.name,
        address: camp.address,
        district: camp.district,
        state: camp.state,
        pincode: camp.pincode,
        startDate: camp.startDate,
        endDate: camp.endDate,
        status: camp.status,
        createdAt: camp.createdAt,
      },
      staff: { doctors, registrationTeam, pharmacyTeam },
      patientSummary: { totalPatients, maleCount, femaleCount, childrenCount, seniorCount },
      patients: patients.map((p: any) => ({
        id: p.id,
        token: p.token,
        name: p.name,
        age: p.age,
        gender: p.gender,
        village: p.village,
        phone: p.phone,
        priority: p.queuePriority || p.priority,
        status: p.status,
        vitals: p.vitals?.[0] || null,
        createdAt: p.createdAt,
      })),
      inventory: inventoryWithUsage,
      lastSyncTime,
    };
  }

  async update(id: string, dto: UpdateCampDTO) {
    const db = getDb();
    await this.findById(id);
    
    const updateData: any = { ...dto };
    if (dto.startDate) updateData.startDate = new Date(dto.startDate);
    if (dto.endDate) updateData.endDate = new Date(dto.endDate);
    
    const camp = await db.camp.update({ where: { id }, data: updateData });
    await this.excelSync.syncWorkbook(id);
    return camp;
  }

  async createFeedback(dto: CreateFeedbackDTO) {
    const db = getDb();
    return db.feedback.create({ data: dto });
  }

  async getFeedbackByCamp(campId: string) {
    const db = getDb();
    const feedback = await db.feedback.findMany({
      where: { campId },
      include: { patient: true },
      orderBy: { createdAt: "desc" },
    });

    const avgRating =
      feedback.length > 0
        ? parseFloat((feedback.reduce((s, f) => s + f.rating, 0) / feedback.length).toFixed(2))
        : 0;

    return { feedback, avgRating, total: feedback.length };
  }
}
