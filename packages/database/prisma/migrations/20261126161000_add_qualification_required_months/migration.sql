ALTER TABLE "Qualification" ADD COLUMN "requiredMonths" INTEGER;

ALTER TABLE "Qualification"
ADD CONSTRAINT "Qualification_requiredMonths_check"
CHECK ("requiredMonths" IS NULL OR "requiredMonths" > 0);
