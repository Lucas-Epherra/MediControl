-- AlterTable
ALTER TABLE "CareGroup" ADD COLUMN     "doctorEmail" TEXT,
ADD COLUMN     "doctorName" TEXT,
ADD COLUMN     "doctorPhone" TEXT,
ADD COLUMN     "doctorSpecialty" TEXT,
ADD COLUMN     "patientAllergies" TEXT,
ADD COLUMN     "patientBirthDate" DATE,
ADD COLUMN     "patientConditions" TEXT;

