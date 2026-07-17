-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "queuePriority" TEXT NOT NULL DEFAULT 'normal',
ADD COLUMN     "queueReason" TEXT,
ADD COLUMN     "queuedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Vitals" ADD COLUMN     "emergencyCondition" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "height" DOUBLE PRECISION,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "pregnancyStatus" TEXT,
ADD COLUMN     "weight" DOUBLE PRECISION;
