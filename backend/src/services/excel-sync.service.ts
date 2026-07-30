import ExcelJS from "exceljs";
import path from "path";
import fs from "fs";
import { getDb } from "../config/database";
import { logger } from "../utils/logger";

const WORKBOOK_DIR = path.join(process.cwd(), "uploads", "workbooks");

/**
 * Centralized Excel Sync Service.
 * Every database mutation that touches camp data should call `syncWorkbook(campId)`
 * after a successful commit. This regenerates the full workbook from the database
 * and writes it to disk at `uploads/workbooks/{campCode}.xlsx`.
 */
export class ExcelSyncService {
  private static instance: ExcelSyncService;
  /** Track per-camp last sync time */
  private syncTimestamps = new Map<string, Date>();

  static getInstance(): ExcelSyncService {
    if (!ExcelSyncService.instance) {
      ExcelSyncService.instance = new ExcelSyncService();
    }
    return ExcelSyncService.instance;
  }

  private constructor() {
    // Ensure workbook directory exists
    if (!fs.existsSync(WORKBOOK_DIR)) {
      fs.mkdirSync(WORKBOOK_DIR, { recursive: true });
    }
  }

  /** Returns last sync time for a camp */
  getLastSyncTime(campId: string): Date | null {
    return this.syncTimestamps.get(campId) ?? null;
  }

  /** Get the file path for a camp workbook */
  getWorkbookPath(campCode: string): string {
    return path.join(WORKBOOK_DIR, `${campCode}.xlsx`);
  }

  /**
   * Main entry point: regenerate the full workbook from the DB and write to disk.
   * Called after every successful database transaction that affects camp data.
   */
  async syncWorkbook(campId: string): Promise<void> {
    try {
      const db = getDb();
      const camp = await db.camp.findUnique({ where: { id: campId } });
      if (!camp) {
        logger.warn(`[ExcelSync] Camp not found: ${campId}`);
        return;
      }

      const workbook = await this.generateWorkbook(campId);
      const filePath = this.getWorkbookPath(camp.campCode);

      await workbook.xlsx.writeFile(filePath);
      this.syncTimestamps.set(campId, new Date());
      logger.info(`[ExcelSync] Workbook synced: ${camp.campCode} → ${filePath}`);
    } catch (err: any) {
      // Never let Excel sync failures crash the main operation
      logger.error(`[ExcelSync] Failed to sync workbook for camp ${campId}: ${err.message}`);
    }
  }

  /**
   * Generate the full workbook from the database.
   */
  async generateWorkbook(campId: string): Promise<ExcelJS.Workbook> {
    const db = getDb();

    // Fetch all camp-related data in parallel
    const [camp, users, patients, inventory, transactions] = await Promise.all([
      db.camp.findUnique({ where: { id: campId } }),
      db.user.findMany({
        where: { campId },
        include: { role: true },
      }),
      db.patient.findMany({
        where: { campId },
        orderBy: { createdAt: "asc" },
        include: {
          vitals: { orderBy: { createdAt: "desc" }, take: 1 },
          prescriptions: {
            include: {
              medicines: { include: { medicine: true } },
              doctor: true,
              doctorNotes: true,
            },
          },
        },
      }),
      db.inventory.findMany({
        where: { campId },
        include: { medicine: { include: { category: true } } },
      }),
      db.medicineTransaction.findMany({
        where: { campId },
        include: { medicine: true },
      }),
    ]);

    if (!camp) throw new Error(`Camp not found: ${campId}`);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Arogya Camp OS";
    workbook.lastModifiedBy = "ExcelSyncService";
    workbook.created = new Date();
    workbook.modified = new Date();

    // Group users by role
    const doctors = users.filter((u: any) => u.role?.name === "doctor");
    const registrationTeam = users.filter((u: any) => u.role?.name === "registration");
    const pharmacyTeam = users.filter((u: any) => u.role?.name === "pharmacy");

    // ── Sheet 1: Camp Information ────────────────────────────────────────────
    const campSheet = workbook.addWorksheet("Camp Information");
    campSheet.columns = [
      { header: "Field", key: "field", width: 30 },
      { header: "Value", key: "value", width: 50 },
    ];
    campSheet.addRows([
      { field: "Camp ID", value: camp.campCode },
      { field: "Camp Name", value: camp.name },
      { field: "Address", value: camp.address },
      { field: "District", value: camp.district },
      { field: "State", value: camp.state },
      { field: "Pincode", value: camp.pincode },
      { field: "Start Date", value: camp.startDate?.toISOString().split("T")[0] ?? "" },
      { field: "End Date", value: camp.endDate?.toISOString().split("T")[0] ?? "" },
      { field: "Status", value: camp.status },
      { field: "Total Doctors", value: doctors.length },
      { field: "Total Registration Staff", value: registrationTeam.length },
      { field: "Total Pharmacy Staff", value: pharmacyTeam.length },
      { field: "Total Patients", value: patients.length },
      { field: "Last Synced", value: new Date().toISOString() },
    ]);
    this.styleHeaderRow(campSheet);

    // ── Sheet 2: Registration Team ──────────────────────────────────────────
    const regSheet = workbook.addWorksheet("Registration Team");
    regSheet.columns = [
      { header: "Name", key: "name", width: 30 },
      { header: "Email", key: "email", width: 35 },
      { header: "Registered On", key: "createdAt", width: 20 },
    ];
    registrationTeam.forEach((u: any) => {
      regSheet.addRow({ name: u.name, email: u.email, createdAt: u.createdAt?.toISOString().split("T")[0] ?? "" });
    });
    this.styleHeaderRow(regSheet);

    // ── Sheet 3: Doctors ────────────────────────────────────────────────────
    const docSheet = workbook.addWorksheet("Doctors");
    docSheet.columns = [
      { header: "Name", key: "name", width: 30 },
      { header: "Email", key: "email", width: 35 },
      { header: "Prescriptions Written", key: "rxCount", width: 22 },
      { header: "Registered On", key: "createdAt", width: 20 },
    ];
    doctors.forEach((u: any) => {
      const rxCount = patients.reduce((sum: number, p: any) =>
        sum + p.prescriptions.filter((rx: any) => rx.doctorId === u.id).length, 0);
      docSheet.addRow({
        name: u.name, email: u.email, rxCount,
        createdAt: u.createdAt?.toISOString().split("T")[0] ?? "",
      });
    });
    this.styleHeaderRow(docSheet);

    // ── Sheet 4: Pharmacy ───────────────────────────────────────────────────
    const pharmSheet = workbook.addWorksheet("Pharmacy");
    pharmSheet.columns = [
      { header: "Name", key: "name", width: 30 },
      { header: "Email", key: "email", width: 35 },
      { header: "Registered On", key: "createdAt", width: 20 },
    ];
    pharmacyTeam.forEach((u: any) => {
      pharmSheet.addRow({ name: u.name, email: u.email, createdAt: u.createdAt?.toISOString().split("T")[0] ?? "" });
    });
    this.styleHeaderRow(pharmSheet);

    // ── Sheet 5: Patient Records ────────────────────────────────────────────
    const patientSheet = workbook.addWorksheet("Patient Records");
    patientSheet.columns = [
      { header: "Token", key: "token", width: 12 },
      { header: "Name", key: "name", width: 25 },
      { header: "Age", key: "age", width: 8 },
      { header: "Gender", key: "gender", width: 12 },
      { header: "Village", key: "village", width: 20 },
      { header: "Phone", key: "phone", width: 15 },
      { header: "Priority", key: "priority", width: 12 },
      { header: "Status", key: "status", width: 20 },
      { header: "BP", key: "bp", width: 12 },
      { header: "Sugar", key: "sugar", width: 10 },
      { header: "Temp (°F)", key: "temp", width: 10 },
      { header: "SpO2 (%)", key: "spo2", width: 10 },
      { header: "Diagnosis", key: "diagnosis", width: 30 },
      { header: "Medicines", key: "medicines", width: 40 },
      { header: "Registered At", key: "createdAt", width: 20 },
    ];
    patients.forEach((p: any) => {
      const latestVitals = p.vitals?.[0];
      const latestRx = p.prescriptions?.[p.prescriptions.length - 1];
      const diagnosis = latestRx?.doctorNotes?.map((n: any) => n.diagnosis).join(", ") || "";
      const meds = latestRx?.medicines?.map((m: any) => `${m.medicine?.name || "?"} (${m.dosage})`).join(", ") || "";

      patientSheet.addRow({
        token: p.token || "",
        name: p.name,
        age: p.age,
        gender: p.gender,
        village: p.village,
        phone: p.phone || "",
        priority: p.queuePriority || p.priority,
        status: p.status,
        bp: latestVitals?.bp || "",
        sugar: latestVitals?.sugar ?? "",
        temp: latestVitals?.temp ?? "",
        spo2: latestVitals?.spo2 ?? "",
        diagnosis,
        medicines: meds,
        createdAt: p.createdAt?.toISOString() ?? "",
      });
    });
    this.styleHeaderRow(patientSheet);

    // ── Sheet 6: Medicine Inventory ──────────────────────────────────────────
    const invSheet = workbook.addWorksheet("Medicine Inventory");
    invSheet.columns = [
      { header: "Medicine Name", key: "name", width: 30 },
      { header: "Category", key: "category", width: 20 },
      { header: "Batch Number", key: "batch", width: 18 },
      { header: "Camp Stock", key: "campStock", width: 15 },
      { header: "Dispensed", key: "dispensed", width: 15 },
      { header: "Remaining", key: "remaining", width: 15 },
    ];
    inventory.forEach((inv: any) => {
      const dispensedCount = transactions
        .filter((t: any) => t.medicineId === inv.medicineId && t.type === "DISPENSED")
        .reduce((sum: number, t: any) => sum + Math.abs(t.quantity), 0);
      invSheet.addRow({
        name: inv.medicine?.name || "Unknown",
        category: inv.medicine?.category?.name || "",
        batch: inv.medicine?.batchNumber || "",
        campStock: inv.quantity + dispensedCount,
        dispensed: dispensedCount,
        remaining: inv.quantity,
      });
    });
    this.styleHeaderRow(invSheet);

    // ── Sheet 7: Daily Summary ──────────────────────────────────────────────
    const summarySheet = workbook.addWorksheet("Daily Summary");
    summarySheet.columns = [
      { header: "Date", key: "date", width: 15 },
      { header: "Patients Registered", key: "registered", width: 22 },
      { header: "Consultations", key: "consultations", width: 18 },
      { header: "Medicines Dispensed", key: "dispensed", width: 22 },
    ];

    // Group patients by date
    const dailyMap = new Map<string, { registered: number; consultations: number; dispensed: number }>();
    patients.forEach((p: any) => {
      const date = p.createdAt?.toISOString().split("T")[0] ?? "unknown";
      if (!dailyMap.has(date)) dailyMap.set(date, { registered: 0, consultations: 0, dispensed: 0 });
      dailyMap.get(date)!.registered++;
      dailyMap.get(date)!.consultations += p.prescriptions?.length || 0;
    });
    transactions
      .filter((t: any) => t.type === "DISPENSED")
      .forEach((t: any) => {
        const date = t.createdAt?.toISOString().split("T")[0] ?? "unknown";
        if (!dailyMap.has(date)) dailyMap.set(date, { registered: 0, consultations: 0, dispensed: 0 });
        dailyMap.get(date)!.dispensed += Math.abs(t.quantity);
      });

    // Sort by date and add rows
    const sortedDates = Array.from(dailyMap.entries()).sort(([a], [b]) => a.localeCompare(b));
    sortedDates.forEach(([date, data]) => {
      summarySheet.addRow({ date, ...data });
    });
    this.styleHeaderRow(summarySheet);

    return workbook;
  }

  /** Style the header row of a worksheet */
  private styleHeaderRow(sheet: ExcelJS.Worksheet): void {
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, size: 11 };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1A56DB" },
    };
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    headerRow.alignment = { vertical: "middle", horizontal: "left" };
    headerRow.height = 24;
  }
}
