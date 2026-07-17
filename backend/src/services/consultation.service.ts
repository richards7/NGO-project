import prisma from "../config/database";
import { AppError } from "../utils/app-error";
import type { CreatePrescriptionDTO, CreateDoctorNoteDTO, CreateFollowUpDTO } from "../dtos/camp.dto";

export class ConsultationService {
  async createPrescription(dto: CreatePrescriptionDTO, doctorId: string) {
    const prescription = await prisma.prescription.create({
      data: {
        doctorId,
        patientId: dto.patientId,
        campId: dto.campId,
        advice: dto.advice,
        medicines: {
          create: dto.medicines.map((m) => ({
            medicineId: m.medicineId,
            dosage: m.dosage,
            frequency: m.frequency,
            duration: m.duration,
          })),
        },
      },
      include: { medicines: { include: { medicine: true } }, doctor: true, patient: true },
    });

    await prisma.patient.update({
      where: { id: dto.patientId },
      data: { status: "Waiting for Pharmacy" },
    });

    return prescription;
  }

  async updatePrescription(prescriptionId: string, dto: CreatePrescriptionDTO, doctorId: string) {
    // Check if it exists
    const rx = await prisma.prescription.findUnique({ where: { id: prescriptionId } });
    if (!rx) throw AppError.notFound("Prescription not found");
    if (rx.doctorId !== doctorId) throw AppError.unauthorized("You can only edit your own prescriptions");

    // Delete existing medicines
    await prisma.prescriptionMedicine.deleteMany({
      where: { prescriptionId },
    });

    // Update prescription with new advice and medicines
    const updatedPrescription = await prisma.prescription.update({
      where: { id: prescriptionId },
      data: {
        advice: dto.advice,
        medicines: {
          create: dto.medicines.map((m) => ({
            medicineId: m.medicineId,
            dosage: m.dosage,
            frequency: m.frequency,
            duration: m.duration,
          })),
        },
      },
      include: { medicines: { include: { medicine: true } }, doctor: true, patient: true },
    });

    return updatedPrescription;
  }

  async getPrescription(id: string) {
    const rx = await prisma.prescription.findUnique({
      where: { id },
      include: {
        medicines: { include: { medicine: true } },
        doctor: true,
        patient: true,
        camp: true,
        doctorNotes: true,
      },
    });
    if (!rx) throw AppError.notFound("Prescription not found");
    return rx;
  }

  async createDoctorNote(dto: CreateDoctorNoteDTO, doctorId: string) {
    return prisma.doctorNote.create({
      data: {
        prescriptionId: dto.prescriptionId,
        campId: dto.campId,
        notes: dto.notes,
        diagnosis: dto.diagnosis,
        doctorId,
      },
    });
  }

  async createFollowUp(dto: CreateFollowUpDTO) {
    return prisma.followUp.create({
      data: {
        patientId: dto.patientId,
        notes: dto.notes,
        dueDate: new Date(dto.dueDate),
      },
    });
  }

  async getPendingFollowUps() {
    return prisma.followUp.findMany({
      where: { completed: false, dueDate: { lte: new Date() } },
      include: { patient: true },
      orderBy: { dueDate: "asc" },
    });
  }

  async completeFollowUp(id: string) {
    return prisma.followUp.update({ where: { id }, data: { completed: true } });
  }

  async storeSignature(prescriptionId: string, signatureBase64: string) {
    const fs = await import("fs");
    const path = await import("path");
    const dir = path.join(process.cwd(), "uploads", "signatures");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const filePath = path.join(dir, `${prescriptionId}.png`);
    const buffer = Buffer.from(signatureBase64, "base64");
    fs.writeFileSync(filePath, buffer);

    return { path: filePath };
  }
}
