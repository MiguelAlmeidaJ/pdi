CREATE TYPE "VideoAssetStatus" AS ENUM ('EMPTY','PROCESSING','READY','ERROR');

CREATE TABLE "Course" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "coverUrl" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "qualificationId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CourseModule" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "order" INTEGER NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CourseModule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CourseLesson" (
  "id" TEXT NOT NULL,
  "moduleId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "order" INTEGER NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "videoStatus" "VideoAssetStatus" NOT NULL DEFAULT 'EMPTY',
  "videoAssetKey" TEXT,
  "manifestFile" TEXT,
  "durationSeconds" INTEGER,
  "minCompletionPercent" INTEGER NOT NULL DEFAULT 90,
  "processingError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CourseLesson_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CourseLessonProgress" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "watchedSeconds" INTEGER NOT NULL DEFAULT 0,
  "lastValidPosition" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "percentage" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CourseLessonProgress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VideoWatchSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastHeartbeatAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastClientPosition" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "lastValidPosition" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "watchedSeconds" INTEGER NOT NULL DEFAULT 0,
  "suspiciousEvents" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "endedAt" TIMESTAMP(3),
  "userAgent" TEXT,
  "ipAddress" TEXT,
  CONSTRAINT "VideoWatchSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Course_qualificationId_key" ON "Course"("qualificationId");
CREATE INDEX "Course_active_createdAt_idx" ON "Course"("active","createdAt");
CREATE UNIQUE INDEX "CourseModule_courseId_order_key" ON "CourseModule"("courseId","order");
CREATE INDEX "CourseModule_courseId_active_idx" ON "CourseModule"("courseId","active");
CREATE UNIQUE INDEX "CourseLesson_moduleId_order_key" ON "CourseLesson"("moduleId","order");
CREATE INDEX "CourseLesson_moduleId_active_idx" ON "CourseLesson"("moduleId","active");
CREATE UNIQUE INDEX "CourseLessonProgress_userId_lessonId_key" ON "CourseLessonProgress"("userId","lessonId");
CREATE INDEX "CourseLessonProgress_lessonId_completedAt_idx" ON "CourseLessonProgress"("lessonId","completedAt");
CREATE UNIQUE INDEX "VideoWatchSession_token_key" ON "VideoWatchSession"("token");
CREATE INDEX "VideoWatchSession_userId_lessonId_startedAt_idx" ON "VideoWatchSession"("userId","lessonId","startedAt");
CREATE INDEX "VideoWatchSession_lessonId_expiresAt_idx" ON "VideoWatchSession"("lessonId","expiresAt");

ALTER TABLE "Course" ADD CONSTRAINT "Course_qualificationId_fkey" FOREIGN KEY ("qualificationId") REFERENCES "Qualification"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CourseModule" ADD CONSTRAINT "CourseModule_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseLesson" ADD CONSTRAINT "CourseLesson_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "CourseModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseLessonProgress" ADD CONSTRAINT "CourseLessonProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseLessonProgress" ADD CONSTRAINT "CourseLessonProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "CourseLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VideoWatchSession" ADD CONSTRAINT "VideoWatchSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VideoWatchSession" ADD CONSTRAINT "VideoWatchSession_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "CourseLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
