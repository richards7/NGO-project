import { getDb, initDb } from "./src/config/database";
import crypto from "crypto";
import bcrypt from "bcryptjs";

const uuidv4 = () => crypto.randomUUID();

async function seedDummyData() {
  await initDb((process.env.DB_MODE as any) || "postgres");
  const db = getDb();
  console.log("Seeding dummy data...");

  // 1. Camps
  const campIds = [uuidv4(), uuidv4(), uuidv4()];
  const camps = [
    { id: campIds[0], campCode: "CMP-2023-0001", name: "Rural Health Checkup", address: "Village A", district: "Nellore", state: "Andhra Pradesh", pincode: "524001", startDate: new Date("2023-10-01"), endDate: new Date("2023-10-05"), status: "Completed" },
    { id: campIds[1], campCode: "CMP-2023-0002", name: "Eye Camp", address: "Village B", district: "Nellore", state: "Andhra Pradesh", pincode: "524002", startDate: new Date("2024-12-05"), endDate: new Date("2024-12-10"), status: "Active" },
    { id: campIds[2], campCode: "CMP-2023-0003", name: "General Checkup", address: "Village C", district: "Nellore", state: "Andhra Pradesh", pincode: "524003", startDate: new Date("2025-01-15"), endDate: new Date("2025-01-20"), status: "Scheduled" }
  ];

  for (const c of camps) {
    const existing = await db.camp.findUnique({ where: { campCode: c.campCode } });
    if (!existing) {
      await db.camp.create({ data: c });
      console.log(`Created camp ${c.campCode}`);
    } else {
      campIds[camps.indexOf(c)] = existing.id;
    }
  }

  // 2. Patients & Vitals
  const patientNames = [
    "Raj Kumar", "Sita Devi", "Ramesh Singh", "Priya Sharma", "Amit Patel",
    "Sneha Reddy", "Vikas Gupta", "Kavita Verma", "Arun Nair", "Neha Joshi"
  ];
  const genders = ["male", "female", "male", "female", "male", "female", "male", "female", "male", "female"];

  const patientIds = [];
  for (let i = 0; i < 10; i++) {
    const pid = uuidv4();
    patientIds.push(pid);
    await db.patient.create({
      data: {
        id: pid,
        name: patientNames[i],
        age: 20 + (i * 3),
        gender: genders[i],
        village: `Village ${String.fromCharCode(65 + (i % 3))}`,
        phone: `98765432${i.toString().padStart(2, "0")}`,
        status: i % 3 === 0 ? "Registered" : i % 3 === 1 ? "In Consultation" : "Completed",
        queuePriority: i % 4 === 0 ? "High" : "Normal",
        queuedAt: new Date().toISOString()
      }
    });

    // Add Vitals
    await db.vitals.create({
      data: {
        id: uuidv4(),
        patientId: pid,
        bp: `${110 + i}/${70 + i}`,
        sugar: 90 + i * 5,
        temp: 98.4 + (i * 0.1),
        pulse: 70 + i * 2,
        spo2: 95 + (i % 5),
        height: 160 + i,
        weight: 60 + i
      }
    });
    console.log(`Created patient & vitals for ${patientNames[i]}`);
  }

  // 3. Medicine Categories & Medicines & Inventory
  const catId = uuidv4();
  let category = await db.medicineCategory.findUnique({ where: { name: "General" } });
  if (!category) {
    category = await db.medicineCategory.create({
      data: { id: catId, name: "General", description: "General Medicines" }
    });
  }

  const meds = [
    { name: "Paracetamol 500mg", stock: 500 },
    { name: "Ibuprofen 400mg", stock: 300 },
    { name: "Amoxicillin 250mg", stock: 150 },
    { name: "Cetirizine 10mg", stock: 200 },
    { name: "Omeprazole 20mg", stock: 100 }
  ];

  for (const m of meds) {
    let existingMed = await db.medicine.findUnique({ where: { name: m.name } });
    if (!existingMed) {
      existingMed = await db.medicine.create({
        data: {
          id: uuidv4(),
          name: m.name,
          categoryId: category.id,
          batchNumber: `BATCH-${Math.floor(Math.random() * 1000)}`,
          expiryDate: new Date("2026-12-31T00:00:00Z").toISOString(),
          stock: m.stock,
          alertLevel: 50
        }
      });
      console.log(`Created medicine ${m.name}`);
    }

    // Add Inventory for Active Camp
    await db.inventory.create({
      data: {
        id: uuidv4(),
        campId: campIds[1],
        medicineId: existingMed.id,
        quantity: Math.floor(m.stock / 2)
      }
    });
  }

  console.log("Dummy data seeding completed!");

  // 4. Default Users
  const roles = ["admin", "registration", "medical_assistant", "doctor", "pharmacy"];
  for (const roleName of roles) {
    const r = await db.role.findUnique({ where: { name: roleName } });
    if (!r) {
      await db.role.create({ data: { id: uuidv4(), name: roleName, description: roleName } });
    }
  }

  const hash = await bcrypt.hash("password123", 12);
  const adminRole = await db.role.findUnique({ where: { name: "admin" } });
  if (adminRole) {
    const existingAdmin = await db.user.findUnique({ where: { email: "admin@campcare.org" } });
    if (!existingAdmin) {
      await db.user.create({
        data: {
          id: uuidv4(),
          email: "admin@campcare.org",
          name: "Default Admin",
          passwordHash: hash,
          roleId: adminRole.id
        }
      });
      console.log("Created default admin user: admin@campcare.org / password123");
    }
  }

  const doctorRole = await db.role.findUnique({ where: { name: "doctor" } });
  if (doctorRole) {
    const existingDoctor = await db.user.findUnique({ where: { email: "doctor@campcare.org" } });
    if (!existingDoctor) {
      await db.user.create({
        data: {
          id: uuidv4(),
          email: "doctor@campcare.org",
          name: "Default Doctor",
          passwordHash: hash,
          roleId: doctorRole.id,
          campId: campIds[1] // CMP-2023-0002
        }
      });
      console.log("Created default doctor user: doctor@campcare.org / password123 / Camp: CMP-2023-0002");
    }
  }
}

seedDummyData().catch(console.error);
