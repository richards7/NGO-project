import prisma from "../config/database";
import { AppError } from "../utils/app-error";
import type { CreateCampDTO, UpdateCampDTO, CreateFeedbackDTO } from "../dtos/camp.dto";

export class CampService {
  async create(dto: CreateCampDTO) {
    const existing = await prisma.camp.findUnique({ where: { campCode: dto.campCode } });
    if (existing) throw AppError.conflict(`Camp code '${dto.campCode}' already exists`);

    return prisma.camp.create({
      data: { ...dto, date: new Date(dto.date) },
    });
  }

  async findAll() {
    return prisma.camp.findMany({
      orderBy: { date: "desc" },
      include: { _count: { select: { prescriptions: true, feedback: true } } },
    });
  }

  async findById(id: string) {
    const camp = await prisma.camp.findUnique({
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
    await this.findById(id);
    return prisma.camp.update({ where: { id }, data: { ...dto, ...(dto.date ? { date: new Date(dto.date) } : {}) } });
  }

  async createFeedback(dto: CreateFeedbackDTO) {
    return prisma.feedback.create({ data: dto });
  }

  async getFeedbackByCamp(campId: string) {
    const feedback = await prisma.feedback.findMany({
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
