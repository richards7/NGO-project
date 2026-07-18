import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { getDb } from "../config/database";

interface PrescriptionData {
  prescriptionId: string;
  doctorName: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  campName: string;
  campLocation: string;
  date: string;
  advice?: string;
  medicines: {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
  }[];
}

export class PDFService {
  private uploadsDir = path.join(process.cwd(), "uploads", "prescriptions");

  constructor() {
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  async generatePrescription(data: PrescriptionData): Promise<string> {
    const filePath = path.join(this.uploadsDir, `rx-${data.prescriptionId}.pdf`);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // ─── Header ────────────────────────────────────────────────────────────
      doc
        .fillColor("#1d4ed8")
        .fontSize(22)
        .font("Helvetica-Bold")
        .text("Arogya Camp OS", 50, 50)
        .fillColor("#6b7280")
        .fontSize(10)
        .font("Helvetica")
        .text("Medical NGO Camp Management Platform", 50, 78)
        .moveDown(0.5);

      // Divider
      doc.moveTo(50, 100).lineTo(545, 100).strokeColor("#e5e7eb").stroke();

      // ─── Camp Info ─────────────────────────────────────────────────────────
      doc
        .fillColor("#374151")
        .fontSize(11)
        .font("Helvetica-Bold")
        .text(`Camp: ${data.campName}`, 50, 115)
        .font("Helvetica")
        .text(`Location: ${data.campLocation}`, 50, 132)
        .text(`Date: ${data.date}`, 50, 149);

      // ─── Patient Info ──────────────────────────────────────────────────────
      doc
        .roundedRect(50, 175, 495, 60, 6)
        .fillColor("#f0f9ff")
        .fill()
        .fillColor("#0c4a6e")
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("PATIENT DETAILS", 65, 185)
        .font("Helvetica")
        .fillColor("#374151")
        .text(`Name: ${data.patientName}`, 65, 200)
        .text(`Age / Gender: ${data.patientAge} yrs / ${data.patientGender}`, 65, 215);

      // ─── Prescription heading ──────────────────────────────────────────────
      doc
        .fillColor("#1d4ed8")
        .fontSize(13)
        .font("Helvetica-Bold")
        .text("Rx — Prescription", 50, 255)
        .moveTo(50, 272)
        .lineTo(545, 272)
        .strokeColor("#93c5fd")
        .stroke();

      // ─── Medicine table ────────────────────────────────────────────────────
      const tableTop = 285;
      const colWidths = [200, 80, 120, 95];
      const headers = ["Medicine", "Dosage", "Frequency", "Duration"];
      let y = tableTop;

      // Table header
      doc
        .fillColor("#1e3a5f")
        .rect(50, y, 495, 20)
        .fill()
        .fillColor("#ffffff")
        .fontSize(9)
        .font("Helvetica-Bold");

      let x = 55;
      headers.forEach((h, i) => {
        doc.text(h, x, y + 6, { width: colWidths[i] });
        x += colWidths[i];
      });

      y += 22;
      doc.font("Helvetica").fillColor("#374151").fontSize(9);

      data.medicines.forEach((med, idx) => {
        const bg = idx % 2 === 0 ? "#f8fafc" : "#ffffff";
        doc.fillColor(bg).rect(50, y, 495, 20).fill();
        doc.fillColor("#374151");

        x = 55;
        const row = [med.name, med.dosage, med.frequency, med.duration];
        row.forEach((cell, i) => {
          doc.text(cell, x, y + 6, { width: colWidths[i] });
          x += colWidths[i];
        });
        y += 22;
      });

      // ─── Advice ────────────────────────────────────────────────────────────
      if (data.advice) {
        y += 15;
        doc
          .fillColor("#374151")
          .font("Helvetica-Bold")
          .fontSize(10)
          .text("Advice:", 50, y)
          .font("Helvetica")
          .text(data.advice, 50, y + 15, { width: 495 });
        y += 40;
      }

      // ─── Doctor signature ──────────────────────────────────────────────────
      y = Math.max(y + 40, 650);
      doc
        .moveTo(350, y)
        .lineTo(545, y)
        .strokeColor("#9ca3af")
        .stroke()
        .fillColor("#374151")
        .fontSize(9)
        .text(`Dr. ${data.doctorName}`, 350, y + 5)
        .text("Authorized Physician", 350, y + 18);

      // ─── Footer ────────────────────────────────────────────────────────────
      doc
        .moveTo(50, 775)
        .lineTo(545, 775)
        .strokeColor("#e5e7eb")
        .stroke()
        .fillColor("#9ca3af")
        .fontSize(8)
        .text(`Prescription ID: ${data.prescriptionId} | Generated: ${new Date().toISOString()}`, 50, 785, {
          align: "center",
          width: 495,
        });

      doc.end();

      stream.on("finish", () => resolve(filePath));
      stream.on("error", reject);
    });
  }
}
