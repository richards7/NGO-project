import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
const uuidv4 = () => crypto.randomUUID();

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding medicines data...');

  // Create Roles
  const roles = ["admin", "registration", "medical_assistant", "doctor", "pharmacy"];
  for (const roleName of roles) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { id: uuidv4(), name: roleName, description: `${roleName} role` },
    });
  }

  // Create Demo Users
  const bcrypt = require('bcryptjs');
  const hash = await bcrypt.hash("demo1234", 12);
  const demoUsers = [
    { name: "Dr. Ananya Rao", email: "admin@arogya.ngo", role: "admin" },
    { name: "Priya Sharma", email: "registration@arogya.ngo", role: "registration" },
    { name: "Dr. Vikram Iyer", email: "vikram@arogya.ngo", role: "doctor" },
    { name: "Suresh Kumar", email: "pharmacy@arogya.ngo", role: "pharmacy" },
  ];

  for (const u of demoUsers) {
    const role = await prisma.role.findUnique({ where: { name: u.role } });
    if (role) {
      await prisma.user.upsert({
        where: { email: u.email },
        update: { passwordHash: hash, roleId: role.id },
        create: {
          id: uuidv4(),
          email: u.email,
          name: u.name,
          passwordHash: hash,
          roleId: role.id,
        },
      });
    }
  }

  // Create Categories
  const catFever = await prisma.medicineCategory.upsert({
    where: { name: 'Fever & Pain' },
    update: {},
    create: { id: uuidv4(), name: 'Fever & Pain', description: 'Analgesics and Antipyretics' },
  });

  const catAntibiotic = await prisma.medicineCategory.upsert({
    where: { name: 'Antibiotics' },
    update: {},
    create: { id: uuidv4(), name: 'Antibiotics', description: 'Bacterial infection treatment' },
  });

  const catVitamins = await prisma.medicineCategory.upsert({
    where: { name: 'Vitamins & Supplements' },
    update: {},
    create: { id: uuidv4(), name: 'Vitamins & Supplements', description: 'Vitamins, Iron, Calcium' },
  });

  const catAllergy = await prisma.medicineCategory.upsert({
    where: { name: 'Allergy & Cold' },
    update: {},
    create: { id: uuidv4(), name: 'Allergy & Cold', description: 'Antihistamines and cough syrups' },
  });

  // Create Medicines
  const medicines = [
    { name: 'Paracetamol 500mg', categoryId: catFever.id, stock: 1000, batchNumber: 'B-P500-2601', alertLevel: 100 },
    { name: 'Ibuprofen 400mg', categoryId: catFever.id, stock: 500, batchNumber: 'B-I400-2602', alertLevel: 50 },
    { name: 'Amoxicillin 250mg', categoryId: catAntibiotic.id, stock: 300, batchNumber: 'B-A250-2601', alertLevel: 50 },
    { name: 'Azithromycin 500mg', categoryId: catAntibiotic.id, stock: 200, batchNumber: 'B-AZ500-2601', alertLevel: 30 },
    { name: 'Vitamin C + Zinc', categoryId: catVitamins.id, stock: 800, batchNumber: 'B-VC-2601', alertLevel: 100 },
    { name: 'Iron Folic Acid', categoryId: catVitamins.id, stock: 600, batchNumber: 'B-IFA-2601', alertLevel: 100 },
    { name: 'Cetirizine 10mg', categoryId: catAllergy.id, stock: 400, batchNumber: 'B-C10-2601', alertLevel: 50 },
    { name: 'Cough Syrup (100ml)', categoryId: catAllergy.id, stock: 150, batchNumber: 'B-CS-2601', alertLevel: 20 },
  ];

  const expiryDate = new Date();
  expiryDate.setFullYear(expiryDate.getFullYear() + 2); // Expiry in 2 years

  for (const med of medicines) {
    await prisma.medicine.upsert({
      where: { name: med.name },
      update: {
        stock: med.stock,
      },
      create: {
        id: uuidv4(),
        name: med.name,
        categoryId: med.categoryId,
        stock: med.stock,
        batchNumber: med.batchNumber,
        expiryDate: expiryDate,
        alertLevel: med.alertLevel,
      },
    });
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
