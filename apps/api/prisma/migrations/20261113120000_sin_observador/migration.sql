-- Se quita el rol VIEWER (issue #26). Quien era observador pasa a cuidador, igual que las
-- invitaciones pendientes con ese rol. Postgres no permite borrar un valor de un enum, así que se
-- crea el tipo nuevo, se pasan las columnas y se borra el viejo.
BEGIN;
UPDATE "Membership" SET "role" = 'CAREGIVER' WHERE "role" = 'VIEWER';
UPDATE "Invitation" SET "role" = 'CAREGIVER' WHERE "role" = 'VIEWER';

CREATE TYPE "GroupRole_new" AS ENUM ('ADMIN', 'CAREGIVER');
ALTER TABLE "Membership" ALTER COLUMN "role" TYPE "GroupRole_new" USING ("role"::text::"GroupRole_new");
ALTER TABLE "Invitation" ALTER COLUMN "role" TYPE "GroupRole_new" USING ("role"::text::"GroupRole_new");
ALTER TYPE "GroupRole" RENAME TO "GroupRole_old";
ALTER TYPE "GroupRole_new" RENAME TO "GroupRole";
DROP TYPE "GroupRole_old";
COMMIT;
