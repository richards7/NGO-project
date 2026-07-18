import { getDb, initDb } from "./src/config/database";
import crypto from "crypto";

const uuidv4 = () => crypto.randomUUID();

async function seedDummyData() {
  await initDb("sqlite");
  const db = getDb();
  console.log("Seeding dummy data...");

  // 1. Camps
  const campIds = [uuidv4(), uuidv4(), uuidv4()];
  const camps = [
    { id: campIds[0], campCode: "CAMP-2023-01", name: "Rural Health Checkup", location: "Village A", date: "2023-10-01", status: "Completed" },
    { id: campIds[1], campCode: "CAMP-2023-02", name: "Eye Camp", location: "Village B", date: "2024-12-05", status: "Active" },
    { id: campIds[2], campCode: "CAMP-2023-03", name: "General Checkup", location: "Village C", date: "2025-01-15", status: "Scheduled" }
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
          expiryDate: "2026-12-31",
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
}

seedDummyData().catch(console.error);
