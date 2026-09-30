-- CreateEnum
CREATE TYPE "SystemRole" AS ENUM ('USER', 'MANAGER', 'ADMIN');

-- CreateEnum
CREATE TYPE "StepCode" AS ENUM ('BASE', 'STEP_1', 'STEP_2', 'STEP_3', 'STEP_4');

-- CreateEnum
CREATE TYPE "QualificationType" AS ENUM ('COURSE', 'KNOWLEDGE', 'TENURE', 'EXPERIENCE');

-- CreateEnum
CREATE TYPE "QualificationStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PromotionStatus" AS ENUM ('DRAFT', 'REQUESTED', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "systemRole" "SystemRole" NOT NULL DEFAULT 'USER',
    "hiredAt" TIMESTAMP(3) NOT NULL,
    "professionalSince" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "teamId" TEXT NOT NULL,
    "roleId" TEXT,
    "currentRoleStepId" TEXT,
    "managerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "teamId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleStep" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "code" "StepCode" NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "salary" DECIMAL(12,2) NOT NULL,
    "minTenureMonths" INTEGER,
    "minExperienceMonths" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Qualification" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "QualificationType" NOT NULL,
    "description" TEXT,
    "referenceUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Qualification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleStepQualification" (
    "id" TEXT NOT NULL,
    "roleStepId" TEXT NOT NULL,
    "qualificationId" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,

    CONSTRAINT "RoleStepQualification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserQualification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "qualificationId" TEXT NOT NULL,
    "status" "QualificationStatus" NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "evidenceUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserQualification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionRequest" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "targetRoleStepId" TEXT NOT NULL,
    "status" "PromotionStatus" NOT NULL DEFAULT 'DRAFT',
    "requestedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "approverId" TEXT,
    "decisionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromotionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionRequestQualification" (
    "id" TEXT NOT NULL,
    "promotionRequestId" TEXT NOT NULL,
    "qualificationName" TEXT NOT NULL,
    "qualificationType" "QualificationType" NOT NULL,
    "required" BOOLEAN NOT NULL,
    "metAtRequest" BOOLEAN NOT NULL,
    "notes" TEXT,

    CONSTRAINT "PromotionRequestQualification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareerHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "roleStepId" TEXT NOT NULL,
    "salary" DECIMAL(12,2) NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CareerHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Team_slug_key" ON "Team"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_teamId_idx" ON "User"("teamId");

-- CreateIndex
CREATE INDEX "User_roleId_idx" ON "User"("roleId");

-- CreateIndex
CREATE INDEX "User_currentRoleStepId_idx" ON "User"("currentRoleStepId");

-- CreateIndex
CREATE INDEX "User_managerId_idx" ON "User"("managerId");

-- CreateIndex
CREATE INDEX "Role_teamId_idx" ON "Role"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_teamId_name_key" ON "Role"("teamId", "name");

-- CreateIndex
CREATE INDEX "RoleStep_roleId_idx" ON "RoleStep"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "RoleStep_roleId_code_key" ON "RoleStep"("roleId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "RoleStep_roleId_order_key" ON "RoleStep"("roleId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Qualification_name_type_key" ON "Qualification"("name", "type");

-- CreateIndex
CREATE INDEX "RoleStepQualification_qualificationId_idx" ON "RoleStepQualification"("qualificationId");

-- CreateIndex
CREATE UNIQUE INDEX "RoleStepQualification_roleStepId_qualificationId_key" ON "RoleStepQualification"("roleStepId", "qualificationId");

-- CreateIndex
CREATE INDEX "UserQualification_qualificationId_idx" ON "UserQualification"("qualificationId");

-- CreateIndex
CREATE UNIQUE INDEX "UserQualification_userId_qualificationId_key" ON "UserQualification"("userId", "qualificationId");

-- CreateIndex
CREATE INDEX "PromotionRequest_requesterId_status_idx" ON "PromotionRequest"("requesterId", "status");

-- CreateIndex
CREATE INDEX "PromotionRequest_approverId_idx" ON "PromotionRequest"("approverId");

-- CreateIndex
CREATE INDEX "PromotionRequestQualification_promotionRequestId_idx" ON "PromotionRequestQualification"("promotionRequestId");

-- CreateIndex
CREATE INDEX "CareerHistory_userId_startedAt_idx" ON "CareerHistory"("userId", "startedAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_currentRoleStepId_fkey" FOREIGN KEY ("currentRoleStepId") REFERENCES "RoleStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleStep" ADD CONSTRAINT "RoleStep_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleStepQualification" ADD CONSTRAINT "RoleStepQualification_roleStepId_fkey" FOREIGN KEY ("roleStepId") REFERENCES "RoleStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleStepQualification" ADD CONSTRAINT "RoleStepQualification_qualificationId_fkey" FOREIGN KEY ("qualificationId") REFERENCES "Qualification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserQualification" ADD CONSTRAINT "UserQualification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserQualification" ADD CONSTRAINT "UserQualification_qualificationId_fkey" FOREIGN KEY ("qualificationId") REFERENCES "Qualification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionRequest" ADD CONSTRAINT "PromotionRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionRequest" ADD CONSTRAINT "PromotionRequest_targetRoleStepId_fkey" FOREIGN KEY ("targetRoleStepId") REFERENCES "RoleStep"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionRequest" ADD CONSTRAINT "PromotionRequest_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionRequestQualification" ADD CONSTRAINT "PromotionRequestQualification_promotionRequestId_fkey" FOREIGN KEY ("promotionRequestId") REFERENCES "PromotionRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerHistory" ADD CONSTRAINT "CareerHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerHistory" ADD CONSTRAINT "CareerHistory_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerHistory" ADD CONSTRAINT "CareerHistory_roleStepId_fkey" FOREIGN KEY ("roleStepId") REFERENCES "RoleStep"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
