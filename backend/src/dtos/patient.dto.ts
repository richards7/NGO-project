import { z } from "zod";

export const createPatientSchema = z.object({
  name: z.string().min(2),
  age: z.number().int().min(0).max(150),
  gender: z.enum(["M", "F", "Other"]),
  village: z.string().min(1),
  phone: z.string().optional(),
  priority: z.enum(["normal", "emergency"]).default("normal"),
  familyId: z.string().uuid().optional(),
});

export const updatePatientSchema = createPatientSchema.partial();

export const captureVitalsSchema = z.object({
  patientId: z.string().uuid(),
  bp: z.string().regex(/^\d{2,3}\/\d{2,3}$/, "BP format must be e.g. 120/80"),
  sugar: z.number().int().min(0).max(600),
  temp: z.number().min(90).max(110),
  pulse: z.number().int().min(20).max(250),
  spo2: z.number().int().min(50).max(100),
  height: z.number().min(0).max(300).optional(),
  weight: z.number().min(0).max(500).optional(),
  pregnancyStatus: z.enum(["none", "pregnant", "postpartum"]).optional(),
  emergencyCondition: z.boolean().optional(),
  notes: z.string().optional(),
  diseases: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
});

export const createFamilySchema = z.object({
  name: z.string().min(2),
  headOfHouseholdId: z.string().uuid().optional(),
});

export type CreatePatientDTO = z.infer<typeof createPatientSchema>;
export type UpdatePatientDTO = z.infer<typeof updatePatientSchema>;
export type CaptureVitalsDTO = z.infer<typeof captureVitalsSchema>;
export type CreateFamilyDTO = z.infer<typeof createFamilySchema>;
