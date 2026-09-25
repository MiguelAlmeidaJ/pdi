-- Scope qualifications by team while preserving existing records.
ALTER TABLE "Qualification" ADD COLUMN "teamId" TEXT;

DROP INDEX IF EXISTS "Qualification_name_type_key";
CREATE UNIQUE INDEX "Qualification_teamId_name_type_key" ON "Qualification"("teamId", "name", "type");
CREATE INDEX "Qualification_teamId_idx" ON "Qualification"("teamId");

ALTER TABLE "Qualification"
ADD CONSTRAINT "Qualification_teamId_fkey"
FOREIGN KEY ("teamId") REFERENCES "Team"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
