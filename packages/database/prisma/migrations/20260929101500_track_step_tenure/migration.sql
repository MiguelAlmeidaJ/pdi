ALTER TABLE "User" ADD COLUMN "currentRoleStepStartedAt" TIMESTAMP(3);
ALTER TABLE "RoleStep" ADD COLUMN "minMonthsInCurrentStep" INTEGER;

UPDATE "User"
SET "currentRoleStepStartedAt" = "hiredAt"
WHERE "currentRoleStepId" IS NOT NULL AND "currentRoleStepStartedAt" IS NULL;
