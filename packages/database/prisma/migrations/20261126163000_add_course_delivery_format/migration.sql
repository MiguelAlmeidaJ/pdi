CREATE TYPE "CourseModality" AS ENUM ('ONLINE', 'IN_PERSON');
CREATE TYPE "CourseDelivery" AS ENUM ('PLATFORM', 'EXTERNAL');

ALTER TABLE "Qualification"
ADD COLUMN "courseModality" "CourseModality",
ADD COLUMN "courseDelivery" "CourseDelivery",
ADD COLUMN "courseExternalUrl" TEXT,
ADD COLUMN "courseInstructions" TEXT;

UPDATE "Qualification"
SET
  "courseModality" = 'ONLINE',
  "courseDelivery" = 'PLATFORM'
WHERE "type" = 'COURSE';
