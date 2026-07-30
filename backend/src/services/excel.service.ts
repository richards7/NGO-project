import ExcelJS from "exceljs";
import { getDb } from "../config/database";
import { AppError } from "../utils/app-error";

export class ExcelService {
  async generateCampReport(campId: string): Promise<ExcelJS.Workbook> {
    const db = getDb();
    
    // Fetch camp data
    const camp = await db.camp.findUnique({
      where: { id: campId },
      include: {
        patients: {
          include: {
            vitals: true,
            prescriptions: {
              include: {
                medicines: { include: { medicine: true } },
                doctor: true,
              }
            },
            feedback: true,
          }
        },
        inventory: { include: { medicine: true } },
      }
    });

    if (!camp) throw AppError.notFound("Camp not found");

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Arogya Camp OS";
    workbook.lastModifiedBy = "System";
    workbook.created = new Date();

    // 1. Camp Summary
    const summarySheet = workbook.addWorksheet("Camp Summary");
    summarySheet.columns = [
      { header: "Field", key: "field", width: 25 },
      { header: "Value", key: "value", width: 40 },
    ];
    summarySheet.addRows([
      { field: "Camp ID", value: camp.campCode },
      { field: "Name", value: camp.name },
      { field: "Address", value: camp.address },
      { field: "District", value: camp.district },
      { field: "State", value: camp.state },
      { field: "Pincode", value: camp.pincode },
      { field: "Start Date", value: camp.startDate.toISOString().split("T")[0] },
      { field: "End Date", value: camp.endDate.toISOString().split("T")[0] },
      { field: "Status", value: camp.status },
      { field: "Total Patients Registered", value: camp.patients.length },
    ]);
    summarySheet.getRow(1).font = { bold: true };

    // 2. Registered Patients
    const patientsSheet = workbook.addWorksheet("Registered Patients");
    patientsSheet.columns = [
      { header: "Token", key: "token", width: 15 },
      { header: "Name", key: "name", width: 25 },
      { header: "Age", key: "age", width: 10 },
      { header: "Gender", key: "gender", width: 15 },
      { header: "Village", key: "village", width: 20 },
      { header: "Phone", key: "phone", width: 15 },
      { header: "Status", key: "status", width: 20 },
      { header: "Registered At", key: "createdAt", width: 20 },
    ];
    camp.patients.forEach(p => {
      patientsSheet.addRow({
        token: p.token,
        name: p.name,
        age: p.age,
        gender: p.gender,
        village: p.village,
        phone: p.phone,
        status: p.status,
        createdAt: p.createdAt.toISOString(),
      });
    });
    patientsSheet.getRow(1).font = { bold: true };

    // 3. Capture Vitals Log
    const vitalsSheet = workbook.addWorksheet("Vitals Log");
    vitalsSheet.columns = [
      { header: "Token", key: "token", width: 15 },
      { header: "Patient Name", key: "name", width: 25 },
      { header: "BP", key: "bp", width: 15 },
      { header: "Sugar", key: "sugar", width: 10 },
      { header: "Temp (°F)", key: "temp", width: 10 },
      { header: "SpO2 (%)", key: "spo2", width: 10 },
      { header: "Pulse", key: "pulse", width: 10 },
      { header: "Pregnancy Status", key: "pregnancyStatus", width: 20 },
      { header: "Emergency", key: "emergency", width: 15 },
      { header: "Notes", key: "notes", width: 30 },
    ];
    camp.patients.forEach(p => {
      p.vitals.forEach(v => {
        vitalsSheet.addRow({
          token: p.token,
          name: p.name,
          bp: v.bp,
          sugar: v.sugar,
          temp: v.temp,
          spo2: v.spo2,
          pulse: v.pulse,
          pregnancyStatus: v.pregnancyStatus || "N/A",
          emergency: v.emergencyCondition ? "Yes" : "No",
          notes: v.notes || "",
        });
      });
    });
    vitalsSheet.getRow(1).font = { bold: true };

    // 4. Doctor Prescriptions
    const rxSheet = workbook.addWorksheet("Doctor Prescriptions");
    rxSheet.columns = [
      { header: "Token", key: "token", width: 15 },
      { header: "Patient Name", key: "name", width: 25 },
      { header: "Doctor", key: "doctor", width: 25 },
      { header: "Advice", key: "advice", width: 40 },
      { header: "Prescribed At", key: "createdAt", width: 20 },
    ];
    camp.patients.forEach(p => {
      p.prescriptions.forEach(rx => {
        rxSheet.addRow({
          token: p.token,
          name: p.name,
          doctor: (rx as any).doctor?.name || "Unknown",
          advice: rx.advice || "",
          createdAt: rx.createdAt.toISOString(),
        });
      });
    });
    rxSheet.getRow(1).font = { bold: true };

    // 5. Pharmacy Dispensed
    const pharmSheet = workbook.addWorksheet("Pharmacy Dispensed");
    pharmSheet.columns = [
      { header: "Token", key: "token", width: 15 },
      { header: "Patient Name", key: "name", width: 25 },
      { header: "Medicine", key: "medicine", width: 25 },
      { header: "Dosage", key: "dosage", width: 15 },
      { header: "Frequency", key: "frequency", width: 15 },
      { header: "Duration", key: "duration", width: 15 },
      { header: "Dispensed At", key: "createdAt", width: 20 },
    ];
    camp.patients.forEach(p => {
      p.prescriptions.forEach(rx => {
        rx.medicines.forEach(m => {
          pharmSheet.addRow({
            token: p.token,
            name: p.name,
            medicine: (m as any).medicine?.name || "Unknown",
            dosage: m.dosage,
            frequency: m.frequency,
            duration: m.duration,
            createdAt: m.createdAt.toISOString(),
          });
        });
      });
    });
    pharmSheet.getRow(1).font = { bold: true };

    // 6. Inventory Used
    const invSheet = workbook.addWorksheet("Inventory Used");
    invSheet.columns = [
      { header: "Medicine", key: "medicine", width: 25 },
      { header: "Initial Stock / Used", key: "quantity", width: 25 },
    ];
    camp.inventory.forEach(inv => {
      invSheet.addRow({
        medicine: (inv as any).medicine?.name || "Unknown",
        quantity: inv.quantity,
      });
    });
    invSheet.getRow(1).font = { bold: true };

    // 7. Feedback / Issues
    const fbSheet = workbook.addWorksheet("Feedback & Issues");
    fbSheet.columns = [
      { header: "Token", key: "token", width: 15 },
      { header: "Rating (1-5)", key: "rating", width: 15 },
      { header: "Comments", key: "comments", width: 40 },
      { header: "Date", key: "createdAt", width: 20 },
    ];
    camp.patients.forEach(p => {
      p.feedback.forEach(fb => {
        fbSheet.addRow({
          token: p.token,
          rating: fb.rating,
          comments: fb.comments || "",
          createdAt: fb.createdAt.toISOString(),
        });
      });
    });
    fbSheet.getRow(1).font = { bold: true };

    return workbook;
  }
}
