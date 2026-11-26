UPDATE "QualificationLink" AS link
SET "order" = link."order" + 1
FROM "Qualification" AS qualification
WHERE link."qualificationId" = qualification."id"
  AND qualification."courseDelivery" = 'EXTERNAL'
  AND qualification."courseExternalUrl" IS NOT NULL
  AND qualification."courseExternalUrl" <> '';

INSERT INTO "QualificationLink" ("id", "qualificationId", "title", "url", "order", "createdAt", "updatedAt")
SELECT
  'external_' || md5(random()::text || clock_timestamp()::text || "id"),
  "id",
  'Acessar plataforma do curso',
  "courseExternalUrl",
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Qualification"
WHERE "courseDelivery" = 'EXTERNAL'
  AND "courseExternalUrl" IS NOT NULL
  AND "courseExternalUrl" <> '';

ALTER TABLE "Qualification" DROP COLUMN IF EXISTS "courseExternalUrl";
