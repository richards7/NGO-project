import { Request, Response, NextFunction } from "express";
import ExcelJS from "exceljs";
import { getDb } from "../config/database";
import { AppError } from "../utils/app-error";

export class ExportController {
  async exportCampData(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { campId } = req.params;
      const db = getDb();

      const camp = await db.camp.findUnique({ where: { id: campId } });
      if (!camp) throw AppError.notFound("Camp not found");

      const patients = await db.patient.findMany({
        where: { campId },
        include: {
          vitals: true,
          prescriptions: {
            include: { medicines: { include: { medicine: true } } }
          }
        }
      });

      const workbook = new ExcelJS.Workbook();
      workbook.creator = "CampCare Camp OS";

      const sheet = workbook.addWorksheet("Patients");

      sheet.columns = [
        { header: "ID", key: "id", width: 36 },
        { header: "Name", key: "name", width: 25 },
        { header: "Age", key: "age", width: 10 },
        { header: "Gender", key: "gender", width: 15 },
        { header: "Village", key: "village", width: 20 },
        { header: "Phone", key: "phone", width: 15 },
        { header: "Priority", key: "priority", width: 15 },
        { header: "Status", key: "status", width: 20 },
        { header: "Vitals count", key: "vitals", width: 15 },
        { header: "Prescriptions count", key: "prescriptions", width: 20 },
      ];

      patients.forEach(patient => {
        sheet.addRow({
          id: patient.id,
          name: patient.name,
          age: patient.age,
          gender: patient.gender,
          village: patient.village,
          phone: patient.phone || "-",
          priority: patient.priority,
          status: patient.status,
          vitals: patient.vitals?.length || 0,
          prescriptions: patient.prescriptions?.length || 0,
        });
      });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename=camp_${camp.campCode}_export.xlsx`);

      await workbook.xlsx.write(res);
      res.end();
    } catch (err) {
      next(err);
    }
  }
}
