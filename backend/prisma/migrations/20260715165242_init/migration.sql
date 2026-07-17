-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Camp" (
    "id" TEXT NOT NULL,
    "campCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Scheduled',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Camp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "token" TEXT,
    "name" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "gender" TEXT NOT NULL,
    "village" TEXT NOT NULL,
    "phone" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "status" TEXT NOT NULL DEFAULT 'Registered',
    "familyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Family" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "headOfHouseholdId" TEXT,
    "healthCardId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Family_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthCard" (
    "id" TEXT NOT NULL,
    "cardNumber" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vitals" (
    "id" TEXT NOT NULL,
    "bp" TEXT NOT NULL,
    "sugar" INTEGER NOT NULL,
    "temp" DOUBLE PRECISION NOT NULL,
    "pulse" INTEGER NOT NULL,
    "spo2" INTEGER NOT NULL,
    "patientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vitals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Disease" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Disease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Allergy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Allergy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prescription" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "campId" TEXT NOT NULL,
    "qrImage" TEXT,
    "pdfPath" TEXT,
    "advice" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrescriptionMedicine" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "duration" TEXT NOT NULL,

    CONSTRAINT "PrescriptionMedicine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Medicine" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "alertLevel" INTEGER NOT NULL DEFAULT 50,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Medicine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicineCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "MedicineCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inventory" (
    "id" TEXT NOT NULL,
    "campId" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicineTransaction" (
    "id" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "campId" TEXT,
    "quantity" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicineTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorNote" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "campId" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "diagnosis" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DoctorNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUp" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "campId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "campId" TEXT,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "generatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_RolePermissions" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_PatientDiseases" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_PatientAllergies" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_name_key" ON "Permission"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Camp_campCode_key" ON "Camp"("campCode");

-- CreateIndex
CREATE UNIQUE INDEX "Family_healthCardId_key" ON "Family"("healthCardId");

-- CreateIndex
CREATE UNIQUE INDEX "HealthCard_cardNumber_key" ON "HealthCard"("cardNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Disease_name_key" ON "Disease"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Allergy_name_key" ON "Allergy"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Medicine_name_key" ON "Medicine"("name");

-- CreateIndex
CREATE UNIQUE INDEX "MedicineCategory_name_key" ON "MedicineCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Inventory_campId_medicineId_key" ON "Inventory"("campId", "medicineId");

-- CreateIndex
CREATE UNIQUE INDEX "_RolePermissions_AB_unique" ON "_RolePermissions"("A", "B");

-- CreateIndex
CREATE INDEX "_RolePermissions_B_index" ON "_RolePermissions"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_PatientDiseases_AB_unique" ON "_PatientDiseases"("A", "B");

-- CreateIndex
CREATE INDEX "_PatientDiseases_B_index" ON "_PatientDiseases"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_PatientAllergies_AB_unique" ON "_PatientAllergies"("A", "B");

-- CreateIndex
CREATE INDEX "_PatientAllergies_B_index" ON "_PatientAllergies"("B");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Family" ADD CONSTRAINT "Family_healthCardId_fkey" FOREIGN KEY ("healthCardId") REFERENCES "HealthCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vitals" ADD CONSTRAINT "Vitals_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_campId_fkey" FOREIGN KEY ("campId") REFERENCES "Camp"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionMedicine" ADD CONSTRAINT "PrescriptionMedicine_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionMedicine" ADD CONSTRAINT "PrescriptionMedicine_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medicine" ADD CONSTRAINT "Medicine_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MedicineCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_campId_fkey" FOREIGN KEY ("campId") REFERENCES "Camp"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineTransaction" ADD CONSTRAINT "MedicineTransaction_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineTransaction" ADD CONSTRAINT "MedicineTransaction_campId_fkey" FOREIGN KEY ("campId") REFERENCES "Camp"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineTransaction" ADD CONSTRAINT "MedicineTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorNote" ADD CONSTRAINT "DoctorNote_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorNote" ADD CONSTRAINT "DoctorNote_campId_fkey" FOREIGN KEY ("campId") REFERENCES "Camp"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorNote" ADD CONSTRAINT "DoctorNote_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_campId_fkey" FOREIGN KEY ("campId") REFERENCES "Camp"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_campId_fkey" FOREIGN KEY ("campId") REFERENCES "Camp"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RolePermissions" ADD CONSTRAINT "_RolePermissions_A_fkey" FOREIGN KEY ("A") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RolePermissions" ADD CONSTRAINT "_RolePermissions_B_fkey" FOREIGN KEY ("B") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PatientDiseases" ADD CONSTRAINT "_PatientDiseases_A_fkey" FOREIGN KEY ("A") REFERENCES "Disease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PatientDiseases" ADD CONSTRAINT "_PatientDiseases_B_fkey" FOREIGN KEY ("B") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PatientAllergies" ADD CONSTRAINT "_PatientAllergies_A_fkey" FOREIGN KEY ("A") REFERENCES "Allergy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PatientAllergies" ADD CONSTRAINT "_PatientAllergies_B_fkey" FOREIGN KEY ("B") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
