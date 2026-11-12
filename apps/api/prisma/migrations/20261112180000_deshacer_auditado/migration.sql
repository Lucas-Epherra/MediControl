-- Deshacer una toma ya no la borra: queda marcada con quién la deshizo y cuándo.

-- AlterTable
ALTER TABLE "DoseRecord" ADD COLUMN     "undoneAt" TIMESTAMP(3),
ADD COLUMN     "undoneById" UUID;

-- La unicidad de la toma pasa a incluir undoneAt. NULLS NOT DISTINCT (PostgreSQL 15+) hace que
-- dos tomas activas (undoneAt nulo) choquen igual que antes, mientras que las deshechas
-- (cada una con su instante) no impiden volver a registrar la toma. Prisma no expresa
-- NULLS NOT DISTINCT en el schema: se agrega a mano acá.

-- DropIndex
DROP INDEX "DoseRecord_scheduleId_scheduledFor_key";

-- CreateIndex
CREATE UNIQUE INDEX "DoseRecord_scheduleId_scheduledFor_undoneAt_key" ON "DoseRecord"("scheduleId", "scheduledFor", "undoneAt") NULLS NOT DISTINCT;

-- AddForeignKey
ALTER TABLE "DoseRecord" ADD CONSTRAINT "DoseRecord_undoneById_fkey" FOREIGN KEY ("undoneById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
