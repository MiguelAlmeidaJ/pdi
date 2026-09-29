ALTER TYPE "QualificationStatus" ADD VALUE IF NOT EXISTS 'AWAITING_REVIEW';

ALTER TABLE "UserQualification"
ADD COLUMN "submissionNotes" TEXT,
ADD COLUMN "submittedAt" TIMESTAMP(3);
