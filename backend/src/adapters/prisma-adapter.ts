/**
 * PrismaAdapter — Wraps the existing PrismaClient to satisfy IDbAdapter.
 *
 * This is a thin passthrough. Every model property delegates directly
 * to the corresponding Prisma delegate. The existing services can use
 * this adapter without any behavioral change.
 */
import { PrismaClient } from "@prisma/client";
import type { IDbAdapter, IModelRepo } from "./db-adapter";

/**
 * Wraps a Prisma delegate (e.g. prisma.patient) into our IModelRepo interface.
 * Since Prisma delegates already match our interface, this is mostly a cast.
 */
function wrapDelegate(delegate: any): IModelRepo {
  return {
    create: (args) => delegate.create(args),
    findUnique: (args) => delegate.findUnique(args),
    findFirst: (args) => delegate.findFirst(args),
    findMany: (args) => delegate.findMany(args),
    update: (args) => delegate.update(args),
    updateMany: (args) => delegate.updateMany(args),
    upsert: (args) => delegate.upsert(args),
    delete: (args) => delegate.delete(args),
    deleteMany: (args) => delegate.deleteMany(args),
    count: (args) => delegate.count(args),
    groupBy: (args) => delegate.groupBy(args),
  };
}

export class PrismaAdapter implements IDbAdapter {
  public readonly mode = "postgres" as const;
  private prisma: PrismaClient;

  // Model repos — lazily initialized
  public user: IModelRepo;
  public role: IModelRepo;
  public permission: IModelRepo;
  public camp: IModelRepo;
  public patient: IModelRepo;
  public family: IModelRepo;
  public healthCard: IModelRepo;
  public vitals: IModelRepo;
  public disease: IModelRepo;
  public allergy: IModelRepo;
  public prescription: IModelRepo;
  public prescriptionMedicine: IModelRepo;
  public medicine: IModelRepo;
  public medicineCategory: IModelRepo;
  public inventory: IModelRepo;
  public medicineTransaction: IModelRepo;
  public doctorNote: IModelRepo;
  public followUp: IModelRepo;
  public feedback: IModelRepo;
  public notification: IModelRepo;
  public auditLog: IModelRepo;
  public report: IModelRepo;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma ?? new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
    });

    // Map every Prisma delegate to our generic interface
    this.user = wrapDelegate(this.prisma.user);
    this.role = wrapDelegate(this.prisma.role);
    this.permission = wrapDelegate(this.prisma.permission);
    this.camp = wrapDelegate(this.prisma.camp);
    this.patient = wrapDelegate(this.prisma.patient);
    this.family = wrapDelegate(this.prisma.family);
    this.healthCard = wrapDelegate(this.prisma.healthCard);
    this.vitals = wrapDelegate(this.prisma.vitals);
    this.disease = wrapDelegate(this.prisma.disease);
    this.allergy = wrapDelegate(this.prisma.allergy);
    this.prescription = wrapDelegate(this.prisma.prescription);
    this.prescriptionMedicine = wrapDelegate(this.prisma.prescriptionMedicine);
    this.medicine = wrapDelegate(this.prisma.medicine);
    this.medicineCategory = wrapDelegate(this.prisma.medicineCategory);
    this.inventory = wrapDelegate(this.prisma.inventory);
    this.medicineTransaction = wrapDelegate(this.prisma.medicineTransaction);
    this.doctorNote = wrapDelegate(this.prisma.doctorNote);
    this.followUp = wrapDelegate(this.prisma.followUp);
    this.feedback = wrapDelegate(this.prisma.feedback);
    this.notification = wrapDelegate(this.prisma.notification);
    this.auditLog = wrapDelegate(this.prisma.auditLog);
    this.report = wrapDelegate(this.prisma.report);
  }

  async $queryRaw<T = any>(query: string, params?: unknown[]): Promise<T> {
    return this.prisma.$queryRawUnsafe(query, ...(params ?? []));
  }

  async $connect(): Promise<void> {
    await this.prisma.$connect();
  }

  async $disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
