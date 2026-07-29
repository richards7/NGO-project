import { getDb } from "../config/database";
import { AppError } from "../utils/app-error";
import type { CreateCampDTO, UpdateCampDTO, CreateFeedbackDTO } from "../dtos/camp.dto";

export class CampService {
  private codeCounter = 0;

  async create(dto: CreateCampDTO) {
    const db = getDb();
    
    // Get the current max camp code
    const lastCamp = await db.camp.findFirst({
      where: { campCode: { startsWith: "C-" } },
      orderBy: { createdAt: "desc" },
    });
    
    if (lastCamp?.campCode) {
      const num = parseInt(lastCamp.campCode.replace("C-", ""), 10);
      if (!isNaN(num) && num >= this.codeCounter) this.codeCounter = num;
    }
    
    this.codeCounter++;
    const campCode = `C-${String(this.codeCounter).padStart(3, "0")}`;

    return db.camp.create({
      data: { ...dto, campCode, date: new Date(dto.date) },
    });
  }

  async findAll() {
    const db = getDb();
    return db.camp.findMany({
      orderBy: { date: "desc" },
      include: { 
        users: true,
        _count: { select: { prescriptions: true, feedback: true } } 
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

  async update(id: string, dto: UpdateCampDTO) {
    const db = getDb();
    await this.findById(id);
    return db.camp.update({ where: { id }, data: { ...dto, ...(dto.date ? { date: new Date(dto.date) } : {}) } });
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
