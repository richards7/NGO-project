/*
  Warnings:

  - You are about to drop the column `date` on the `Camp` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `Camp` table. All the data in the column will be lost.
  - Added the required column `address` to the `Camp` table without a default value. This is not possible if the table is not empty.
  - Added the required column `district` to the `Camp` table without a default value. This is not possible if the table is not empty.
  - Added the required column `endDate` to the `Camp` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pincode` to the `Camp` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startDate` to the `Camp` table without a default value. This is not possible if the table is not empty.
  - Added the required column `state` to the `Camp` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Camp" DROP COLUMN "date",
DROP COLUMN "location",
ADD COLUMN     "address" TEXT NOT NULL,
ADD COLUMN     "district" TEXT NOT NULL,
ADD COLUMN     "endDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "ngoId" TEXT,
ADD COLUMN     "pincode" TEXT NOT NULL,
ADD COLUMN     "startDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "state" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "campId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "campId" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_campId_fkey" FOREIGN KEY ("campId") REFERENCES "Camp"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Camp" ADD CONSTRAINT "Camp_ngoId_fkey" FOREIGN KEY ("ngoId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_campId_fkey" FOREIGN KEY ("campId") REFERENCES "Camp"("id") ON DELETE SET NULL ON UPDATE CASCADE;
