CREATE TABLE "VisualIdentity" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "appName" TEXT NOT NULL DEFAULT 'Trilha',
  "tagline" TEXT NOT NULL DEFAULT 'Evolução profissional com clareza.',
  "logoLight" TEXT,
  "logoDark" TEXT,
  "iconLight" TEXT,
  "iconDark" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VisualIdentity_pkey" PRIMARY KEY ("id")
);

INSERT INTO "VisualIdentity" ("id","appName","tagline","updatedAt")
VALUES ('default','Trilha','Evolução profissional com clareza.',CURRENT_TIMESTAMP);
