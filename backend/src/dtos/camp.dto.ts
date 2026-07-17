import { z } from "zod";

export const createPrescriptionSchema = z.object({
  patientId: z.string().uuid(),
  campId: z.string().uuid(),
  advice: z.string().optional(),
  medicines: z.array(z.object({
    medicineId: z.string().uuid(),
    dosage: z.string().min(1),
    frequency: z.string().min(1),
    duration: z.string().min(1),
  })).min(1, "At least one medicine is required"),
});

export const createDoctorNoteSchema = z.object({
  prescriptionId: z.string().uuid(),
  campId: z.string().uuid(),
  notes: z.string().min(1),
  diagnosis: z.string().min(1),
});

export const createFollowUpSchema = z.object({
  patientId: z.string().uuid(),
  notes: z.string().min(1),
  dueDate: z.string().datetime(),
});

export const dispenseMedicineSchema = z.object({
  prescriptionId: z.string().uuid(),
  campId: z.string().uuid(),
});

export const createCampSchema = z.object({
  name: z.string().min(2),
  location: z.string().min(2),
  date: z.string().datetime(),
  campCode: z.string().min(1),
});

export const updateCampSchema = createCampSchema.partial().extend({
  status: z.enum(["Scheduled", "Active", "Completed"]).optional(),
});

export const createFeedbackSchema = z.object({
  patientId: z.string().uuid(),
  campId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comments: z.string().optional(),
});

export type CreatePrescriptionDTO = z.infer<typeof createPrescriptionSchema>;
export type CreateDoctorNoteDTO = z.infer<typeof createDoctorNoteSchema>;
export type CreateFollowUpDTO = z.infer<typeof createFollowUpSchema>;
export type DispenseMedicineDTO = z.infer<typeof dispenseMedicineSchema>;
export type CreateCampDTO = z.infer<typeof createCampSchema>;
export type UpdateCampDTO = z.infer<typeof updateCampSchema>;
export type CreateFeedbackDTO = z.infer<typeof createFeedbackSchema>;
