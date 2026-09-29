ALTER TABLE "UserQualification"
ADD COLUMN "evaluatorId" TEXT,
ADD COLUMN "evaluatedAt" TIMESTAMP(3);

CREATE INDEX "UserQualification_evaluatorId_idx" ON "UserQualification"("evaluatorId");

ALTER TABLE "UserQualification"
ADD CONSTRAINT "UserQualification_evaluatorId_fkey"
FOREIGN KEY ("evaluatorId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
