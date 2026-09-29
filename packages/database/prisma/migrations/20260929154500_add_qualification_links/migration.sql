CREATE TABLE "QualificationLink" (
  "id" TEXT NOT NULL,
  "qualificationId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QualificationLink_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "QualificationLink_qualificationId_order_idx"
ON "QualificationLink"("qualificationId", "order");

ALTER TABLE "QualificationLink"
ADD CONSTRAINT "QualificationLink_qualificationId_fkey"
FOREIGN KEY ("qualificationId") REFERENCES "Qualification"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "QualificationLink" ("id","qualificationId","title","url","order","createdAt","updatedAt")
SELECT
  'legacy_' || md5(random()::text || clock_timestamp()::text || "id"),
  "id",
  'Referência',
  "referenceUrl",
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Qualification"
WHERE "referenceUrl" IS NOT NULL AND "referenceUrl" <> '';
