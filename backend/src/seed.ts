import { initDb, getDb } from "./config/database";
import { v4 as uuidv4 } from "uuid";

process.env.DATABASE_URL = "sqlite";
process.env.JWT_SECRET = "testsecretkey123456";
process.env.JWT_REFRESH_SECRET = "testsecretkey123456";

async function run() {
  await initDb("sqlite");
  const db = getDb();

  console.log("Seeding dummy patients...");
  
  const dummyPatients = [
    {
      id: uuidv4(),
      name: "Ramesh Kumar",
      age: 45,
      gender: "Male",
      village: "Kondapur",
      phone: "9876543210",
      priority: "normal",
      status: "Registered",
      queuePriority: "normal",
      token: "T-" + Math.floor(Math.random() * 900 + 100)
    },
    {
      id: uuidv4(),
      name: "Sunita Reddy",
      age: 38,
      gender: "Female",
      village: "Madhapur",
      phone: "9876543211",
      priority: "normal",
      status: "Registered",
      queuePriority: "normal",
      token: "T-" + Math.floor(Math.random() * 900 + 100)
    },
    {
      id: uuidv4(),
      name: "Venkat Rao",
      age: 62,
      gender: "Male",
      village: "Gachibowli",
      phone: "9876543212",
      priority: "normal",
      status: "Registered",
      queuePriority: "normal",
      token: "T-" + Math.floor(Math.random() * 900 + 100)
    }
  ];

  for (const p of dummyPatients) {
    await db.patient.create({ data: p });
  }

  console.log("Seeding dummy medicines...");

  // Need a category first
  const category = await db.medicineCategory.create({
    data: {
      id: uuidv4(),
      name: "General " + Math.random(),
      description: "General medicines"
    }
  });

  const dummyMedicines = [
    {
      id: uuidv4(),
      name: "Paracetamol 500mg",
      categoryId: category.id,
      batchNumber: "B123",
      expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
      stock: 1000,
      alertLevel: 100
    },
    {
      id: uuidv4(),
      name: "Amoxicillin 250mg",
      categoryId: category.id,
      batchNumber: "B124",
      expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
      stock: 500,
      alertLevel: 50
    },
    {
      id: uuidv4(),
      name: "Cetirizine 10mg",
      categoryId: category.id,
      batchNumber: "B125",
      expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
      stock: 800,
      alertLevel: 80
    }
  ];

  for (const m of dummyMedicines) {
    await db.medicine.create({ data: m });
  }

  console.log("Seed complete.");
}

run().catch(console.error);
