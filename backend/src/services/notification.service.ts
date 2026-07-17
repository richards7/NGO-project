import fs from "fs";
import path from "path";
import { logger } from "../utils/logger";

interface EmailPayload {
  to: string;
  subject: string;
  text: string;
  attachmentPath?: string;
}

interface SMSPayload {
  to: string;
  message: string;
}

export class NotificationService {
  private logDir = path.join(process.cwd(), "logs", "notifications");

  constructor() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * Mock email sender — logs to file and console.
   * Replace this with SendGrid/SES integration in production.
   */
  async sendEmail(payload: EmailPayload): Promise<void> {
    const entry = {
      type: "EMAIL",
      to: payload.to,
      subject: payload.subject,
      body: payload.text,
      attachment: payload.attachmentPath ?? null,
      sentAt: new Date().toISOString(),
    };

    logger.info(`📧 [MOCK EMAIL] To: ${payload.to} | Subject: ${payload.subject}`);
    const logPath = path.join(this.logDir, "email.log");
    fs.appendFileSync(logPath, JSON.stringify(entry) + "\n");
  }

  /**
   * Mock SMS sender — logs to file and console.
   * Replace with Twilio/MSG91 in production.
   */
  async sendSMS(payload: SMSPayload): Promise<void> {
    const entry = {
      type: "SMS",
      to: payload.to,
      message: payload.message,
      sentAt: new Date().toISOString(),
    };

    logger.info(`📱 [MOCK SMS] To: ${payload.to} | Message: ${payload.message}`);
    const logPath = path.join(this.logDir, "sms.log");
    fs.appendFileSync(logPath, JSON.stringify(entry) + "\n");
  }

  async sendPrescriptionEmail(to: string, patientName: string, pdfPath: string): Promise<void> {
    await this.sendEmail({
      to,
      subject: `Your Prescription — Arogya Camp OS`,
      text: `Dear ${patientName},\n\nYour prescription from Arogya Camp OS is attached.\n\nStay healthy!\n— Arogya Camp Team`,
      attachmentPath: pdfPath,
    });
  }

  async sendPrescriptionSMS(phone: string, patientName: string, prescriptionId: string): Promise<void> {
    await this.sendSMS({
      to: phone,
      message: `Hello ${patientName}, your prescription (${prescriptionId}) is ready. Collect your medicines from the pharmacy counter. — Arogya Camp OS`,
    });
  }

  async sendFollowUpReminder(phone: string, email: string, patientName: string, dueDate: string): Promise<void> {
    await this.sendSMS({
      to: phone,
      message: `Hello ${patientName}, you have a follow-up appointment on ${dueDate}. Please visit the camp. — Arogya Camp OS`,
    });
    await this.sendEmail({
      to: email,
      subject: "Follow-up Reminder — Arogya Camp OS",
      text: `Dear ${patientName},\n\nThis is a reminder for your follow-up on ${dueDate}.\n\n— Arogya Camp Team`,
    });
  }
}
