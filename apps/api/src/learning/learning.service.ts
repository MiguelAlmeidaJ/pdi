import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationType,
  QualificationStatus,
  QualificationType,
  SystemRole,
  VideoAssetStatus,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import {
  existsSync,
  mkdirSync,
  rmSync,
  readFileSync,
  unlinkSync,
} from 'fs';
import { basename, extname, join, resolve } from 'path';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CreateCourseModuleDto } from './dto/create-module.dto';
import { UpdateCourseModuleDto } from './dto/update-module.dto';
import { CreateCourseLessonDto } from './dto/create-lesson.dto';
import { UpdateCourseLessonDto } from './dto/update-lesson.dto';
import { LessonHeartbeatDto } from './dto/heartbeat.dto';

const execFileAsync = promisify(execFile);

type Actor = { sub: string; systemRole: SystemRole };

@Injectable()
export class LearningService {
  private readonly storageRoot = resolve(
    process.env.COURSE_STORAGE_PATH || join(__dirname, '../../../../storage/courses'),
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {
    mkdirSync(this.storageRoot, { recursive: true });
  }

  async listCourses(actor: Actor) {
    const teamId =
      actor.systemRole === SystemRole.MANAGER
        ? await this.getActorTeamId(actor.sub)
        : undefined;

    return this.prisma.course.findMany({
      where: teamId ? { qualification: { teamId } } : undefined,
      include: {
        qualification: {
          select: {
            id: true,
            name: true,
            team: { select: { id: true, name: true } },
          },
        },
        modules: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                order: true,
                active: true,
                videoStatus: true,
                durationSeconds: true,
                minCompletionPercent: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCourse(id: string, actor: Actor) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        qualification: {
          select: {
            id: true,
            name: true,
            type: true,
            teamId: true,
            team: { select: { id: true, name: true } },
          },
        },
        modules: {
          orderBy: { order: 'asc' },
          include: { lessons: { orderBy: { order: 'asc' } } },
        },
      },
    });
    if (!course) throw new NotFoundException('Curso não encontrado');
    await this.assertCanManageCourse(actor, course.qualification?.teamId ?? null);
    return course;
  }

  async createCourse(dto: CreateCourseDto, actor: Actor) {
    const qualification = await this.assertManageQualification(dto.qualificationId, actor);

    const existing = await this.prisma.course.findUnique({
      where: { qualificationId: qualification.id },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException('Esta qualificação já possui um curso interno vinculado');
    }

    return this.prisma.course.create({
      data: {
        title: dto.title.trim(),
        description: dto.description?.trim(),
        coverUrl: dto.coverUrl,
        qualificationId: qualification.id,
      },
      include: {
        qualification: {
          select: { id: true, name: true, team: { select: { id: true, name: true } } },
        },
      },
    });
  }

  async updateCourse(id: string, dto: UpdateCourseDto, actor: Actor) {
    const current = await this.prisma.course.findUnique({
      where: { id },
      include: { qualification: { select: { teamId: true } } },
    });
    if (!current) throw new NotFoundException('Curso não encontrado');
    await this.assertCanManageCourse(actor, current.qualification?.teamId ?? null);

    if (dto.qualificationId && dto.qualificationId !== current.qualificationId) {
      await this.assertManageQualification(dto.qualificationId, actor);
      const conflict = await this.prisma.course.findUnique({
        where: { qualificationId: dto.qualificationId },
        select: { id: true },
      });
      if (conflict && conflict.id !== id) {
        throw new BadRequestException('Esta qualificação já possui um curso interno vinculado');
      }
    }

    return this.prisma.course.update({
      where: { id },
      data: {
        title: dto.title?.trim(),
        description: dto.description?.trim(),
        coverUrl: dto.coverUrl,
        qualificationId: dto.qualificationId,
        active: dto.active,
      },
    });
  }

  async createModule(courseId: string, dto: CreateCourseModuleDto, actor: Actor) {
    const course = await this.getCourse(courseId, actor);
    const max = await this.prisma.courseModule.aggregate({
      where: { courseId },
      _max: { order: true },
    });
    return this.prisma.courseModule.create({
      data: {
        courseId: course.id,
        title: dto.title.trim(),
        description: dto.description?.trim(),
        order: dto.order ?? (max._max.order ?? -1) + 1,
      },
    });
  }

  async updateModule(id: string, dto: UpdateCourseModuleDto, actor: Actor) {
    const module = await this.prisma.courseModule.findUnique({
      where: { id },
      include: {
        course: { include: { qualification: { select: { teamId: true } } } },
      },
    });
    if (!module) throw new NotFoundException('Módulo não encontrado');
    await this.assertCanManageCourse(actor, module.course.qualification?.teamId ?? null);

    return this.prisma.courseModule.update({
      where: { id },
      data: {
        title: dto.title?.trim(),
        description: dto.description?.trim(),
        order: dto.order,
        active: dto.active,
      },
    });
  }

  async createLesson(moduleId: string, dto: CreateCourseLessonDto, actor: Actor) {
    const module = await this.prisma.courseModule.findUnique({
      where: { id: moduleId },
      include: {
        course: { include: { qualification: { select: { teamId: true } } } },
      },
    });
    if (!module) throw new NotFoundException('Módulo não encontrado');
    await this.assertCanManageCourse(actor, module.course.qualification?.teamId ?? null);

    const max = await this.prisma.courseLesson.aggregate({
      where: { moduleId },
      _max: { order: true },
    });

    return this.prisma.courseLesson.create({
      data: {
        moduleId,
        title: dto.title.trim(),
        description: dto.description?.trim(),
        order: dto.order ?? (max._max.order ?? -1) + 1,
        minCompletionPercent: dto.minCompletionPercent ?? 90,
      },
    });
  }

  async updateLesson(id: string, dto: UpdateCourseLessonDto, actor: Actor) {
    const lesson = await this.prisma.courseLesson.findUnique({
      where: { id },
      include: {
        module: {
          include: {
            course: { include: { qualification: { select: { teamId: true } } } },
          },
        },
      },
    });
    if (!lesson) throw new NotFoundException('Aula não encontrada');
    await this.assertCanManageCourse(actor, lesson.module.course.qualification?.teamId ?? null);

    return this.prisma.courseLesson.update({
      where: { id },
      data: {
        title: dto.title?.trim(),
        description: dto.description?.trim(),
        order: dto.order,
        active: dto.active,
        minCompletionPercent: dto.minCompletionPercent,
      },
    });
  }

  async queueVideoProcessing(
    lessonId: string,
    file: { path: string; originalname: string; mimetype: string },
    actor: Actor,
  ) {
    const lesson = await this.prisma.courseLesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          include: {
            course: { include: { qualification: { select: { teamId: true } } } },
          },
        },
      },
    });
    if (!lesson) throw new NotFoundException('Aula não encontrada');
    await this.assertCanManageCourse(actor, lesson.module.course.qualification?.teamId ?? null);

    if (!file?.path) throw new BadRequestException('Arquivo de vídeo não enviado');

    await this.prisma.courseLesson.update({
      where: { id: lessonId },
      data: {
        videoStatus: VideoAssetStatus.PROCESSING,
        processingError: null,
      },
    });

    void this.processVideo(lessonId, file.path).catch(() => undefined);

    return {
      lessonId,
      status: VideoAssetStatus.PROCESSING,
      message: 'Vídeo recebido e enviado para processamento HLS',
    };
  }

  private async processVideo(lessonId: string, inputPath: string) {
    const assetKey = randomBytes(12).toString('hex');
    const targetDir = join(this.storageRoot, lessonId, assetKey);
    mkdirSync(targetDir, { recursive: true });

    try {
      const ffprobe = process.env.FFPROBE_PATH || 'ffprobe';
      const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';

      const probe = await execFileAsync(
        ffprobe,
        ['-v', 'quiet', '-print_format', 'json', '-show_format', inputPath],
        { maxBuffer: 10 * 1024 * 1024 },
      );
      const parsed = JSON.parse(probe.stdout || '{}');
      const duration = Math.max(1, Math.round(Number(parsed?.format?.duration || 0)));
      if (!Number.isFinite(duration) || duration <= 0) {
        throw new Error('Não foi possível identificar a duração do vídeo');
      }

      const manifest = join(targetDir, 'master.m3u8');
      const segmentPattern = join(targetDir, 'segment_%05d.ts');

      await execFileAsync(
        ffmpeg,
        [
          '-y',
          '-i',
          inputPath,
          '-map',
          '0:v:0',
          '-map',
          '0:a:0?',
          '-c:v',
          'libx264',
          '-preset',
          'veryfast',
          '-crf',
          '23',
          '-c:a',
          'aac',
          '-b:a',
          '128k',
          '-hls_time',
          '6',
          '-hls_playlist_type',
          'vod',
          '-hls_flags',
          'independent_segments',
          '-hls_segment_filename',
          segmentPattern,
          manifest,
        ],
        { maxBuffer: 20 * 1024 * 1024 },
      );

      await this.prisma.courseLesson.update({
        where: { id: lessonId },
        data: {
          videoStatus: VideoAssetStatus.READY,
          videoAssetKey: assetKey,
          manifestFile: 'master.m3u8',
          durationSeconds: duration,
          processingError: null,
        },
      });
    } catch (error) {
      rmSync(targetDir, { recursive: true, force: true });
      await this.prisma.courseLesson.update({
        where: { id: lessonId },
        data: {
          videoStatus: VideoAssetStatus.ERROR,
          processingError:
            error instanceof Error
              ? error.message.slice(0, 1000)
              : 'Falha ao processar o vídeo',
        },
      });
    } finally {
      try {
        unlinkSync(inputPath);
      } catch {}
    }
  }

  async getMyCourse(courseId: string, userId: string) {
    const course = await this.assertUserCourseAccess(courseId, userId);

    const progressRows = await this.prisma.courseLessonProgress.findMany({
      where: {
        userId,
        lesson: { module: { courseId } },
      },
    });
    const progress = new Map(progressRows.map((item) => [item.lessonId, item]));

    const orderedLessons = course.modules.flatMap((module) =>
      module.lessons.map((lesson) => ({ ...lesson, moduleId: module.id })),
    );

    let previousCompleted = true;
    const lessonState = new Map<
      string,
      { unlocked: boolean; progress: (typeof progressRows)[number] | null }
    >();

    for (const lesson of orderedLessons) {
      const row = progress.get(lesson.id) ?? null;
      const unlocked = previousCompleted;
      lessonState.set(lesson.id, { unlocked, progress: row });
      previousCompleted = Boolean(row?.completedAt);
    }

    const completedLessons = orderedLessons.filter(
      (lesson) => progress.get(lesson.id)?.completedAt,
    ).length;

    return {
      id: course.id,
      title: course.title,
      description: course.description,
      coverUrl: course.coverUrl,
      qualification: course.qualification
        ? { id: course.qualification.id, name: course.qualification.name }
        : null,
      progress: {
        completedLessons,
        totalLessons: orderedLessons.length,
        percentage:
          orderedLessons.length === 0
            ? 0
            : Math.round((completedLessons / orderedLessons.length) * 100),
      },
      modules: course.modules.map((module) => ({
        id: module.id,
        title: module.title,
        description: module.description,
        order: module.order,
        unlocked:
          module.lessons.length === 0 ||
          Boolean(lessonState.get(module.lessons[0].id)?.unlocked),
        lessons: module.lessons.map((lesson) => {
          const state = lessonState.get(lesson.id)!;
          return {
            id: lesson.id,
            title: lesson.title,
            description: lesson.description,
            order: lesson.order,
            videoStatus: lesson.videoStatus,
            durationSeconds: lesson.durationSeconds,
            minCompletionPercent: lesson.minCompletionPercent,
            unlocked: state.unlocked,
            progress: state.progress
              ? {
                  watchedSeconds: state.progress.watchedSeconds,
                  lastValidPosition: state.progress.lastValidPosition,
                  percentage: state.progress.percentage,
                  completedAt: state.progress.completedAt,
                }
              : {
                  watchedSeconds: 0,
                  lastValidPosition: 0,
                  percentage: 0,
                  completedAt: null,
                },
          };
        }),
      })),
    };
  }

  async startSession(
    lessonId: string,
    userId: string,
    meta?: { userAgent?: string; ipAddress?: string },
  ) {
    const lesson = await this.prisma.courseLesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          include: {
            course: {
              include: {
                qualification: true,
                modules: {
                  where: { active: true },
                  orderBy: { order: 'asc' },
                  include: {
                    lessons: { where: { active: true }, orderBy: { order: 'asc' } },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!lesson) throw new NotFoundException('Aula não encontrada');
    if (!lesson.active || !lesson.module.active || !lesson.module.course.active) {
      throw new ForbiddenException('Esta aula não está disponível');
    }
    if (
      lesson.videoStatus !== VideoAssetStatus.READY ||
      !lesson.manifestFile ||
      !lesson.durationSeconds
    ) {
      throw new BadRequestException('O vídeo desta aula ainda não está pronto');
    }

    const courseState = await this.getMyCourse(lesson.module.courseId, userId);
    const target = courseState.modules
      .flatMap((module) => module.lessons)
      .find((item) => item.id === lessonId);
    if (!target?.unlocked) {
      throw new ForbiddenException('Conclua a aula anterior antes de continuar');
    }

    const progress = await this.prisma.courseLessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: {
        userId,
        lessonId,
        startedAt: new Date(),
      },
      update: {
        startedAt: target.progress.completedAt ? undefined : new Date(),
      },
    });

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);

    const session = await this.prisma.videoWatchSession.create({
      data: {
        userId,
        lessonId,
        token,
        expiresAt,
        lastClientPosition: progress.lastValidPosition,
        lastValidPosition: progress.lastValidPosition,
        watchedSeconds: progress.watchedSeconds,
        userAgent: meta?.userAgent,
        ipAddress: meta?.ipAddress,
      },
    });

    return {
      sessionId: session.id,
      manifestUrl:
        '/api/learning/media/' +
        lessonId +
        '/' +
        lesson.manifestFile +
        '?token=' +
        token,
      allowedPosition: progress.lastValidPosition,
      durationSeconds: lesson.durationSeconds,
      minCompletionPercent: lesson.minCompletionPercent,
      completed: Boolean(progress.completedAt),
    };
  }

  async heartbeat(sessionId: string, userId: string, dto: LessonHeartbeatDto) {
    const session = await this.prisma.videoWatchSession.findUnique({
      where: { id: sessionId },
      include: { lesson: true },
    });
    if (!session || session.userId !== userId) {
      throw new NotFoundException('Sessão de vídeo não encontrada');
    }
    if (session.endedAt || session.expiresAt <= new Date()) {
      throw new ForbiddenException('A sessão de reprodução expirou');
    }

    const now = new Date();
    const elapsed = Math.max(
      0,
      (now.getTime() - session.lastHeartbeatAt.getTime()) / 1000,
    );
    const position = Math.min(
      Math.max(0, dto.position),
      session.lesson.durationSeconds ?? dto.position,
    );
    const delta = position - session.lastClientPosition;

    const active =
      dto.playing &&
      dto.visible &&
      Math.abs(dto.playbackRate - 1) <= 0.02 &&
      elapsed >= 0.5 &&
      elapsed <= 25;

    const sequentialAdvance =
      delta >= -1.25 &&
      delta <= elapsed + 2.75 &&
      delta <= elapsed * 1.4 + 1.5;

    const valid = active && sequentialAdvance;
    let frontier = session.lastValidPosition;
    let clientPosition = session.lastClientPosition;
    let suspiciousEvents = session.suspiciousEvents;

    if (valid) {
      clientPosition = position;
      if (position > frontier) frontier = position;
    } else if (dto.playing && dto.visible && delta > 2.5) {
      suspiciousEvents += 1;
    } else if (delta <= 0) {
      clientPosition = position;
    }

    const duration = session.lesson.durationSeconds ?? 0;
    const watchedSeconds = Math.min(duration, Math.floor(frontier));
    const percentage =
      duration > 0 ? Math.min(100, Math.floor((frontier / duration) * 100)) : 0;
    const completed =
      duration > 0 &&
      percentage >= session.lesson.minCompletionPercent &&
      frontier >= duration * (session.lesson.minCompletionPercent / 100);

    const previousProgress = await this.prisma.courseLessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId: session.lessonId } },
    });

    await this.prisma.$transaction([
      this.prisma.videoWatchSession.update({
        where: { id: session.id },
        data: {
          lastHeartbeatAt: now,
          lastClientPosition: clientPosition,
          lastValidPosition: frontier,
          watchedSeconds,
          suspiciousEvents,
        },
      }),
      this.prisma.courseLessonProgress.upsert({
        where: { userId_lessonId: { userId, lessonId: session.lessonId } },
        create: {
          userId,
          lessonId: session.lessonId,
          startedAt: session.startedAt,
          watchedSeconds,
          lastValidPosition: frontier,
          percentage,
          completedAt: completed ? now : null,
        },
        update: {
          watchedSeconds,
          lastValidPosition: frontier,
          percentage,
          completedAt:
            completed && !previousProgress?.completedAt
              ? now
              : previousProgress?.completedAt,
        },
      }),
    ]);

    if (completed && !previousProgress?.completedAt) {
      await this.completeCourseIfEligible(userId, session.lessonId);
    }

    return {
      accepted: valid,
      allowedPosition: valid ? position : clientPosition,
      maxWatchedPosition: frontier,
      watchedSeconds,
      percentage,
      completed,
      suspiciousEvents,
    };
  }

  async endSession(sessionId: string, userId: string) {
    const session = await this.prisma.videoWatchSession.findUnique({
      where: { id: sessionId },
      select: { id: true, userId: true, endedAt: true },
    });
    if (!session || session.userId !== userId) {
      throw new NotFoundException('Sessão de vídeo não encontrada');
    }
    if (session.endedAt) return { success: true };

    await this.prisma.videoWatchSession.update({
      where: { id: sessionId },
      data: { endedAt: new Date() },
    });
    return { success: true };
  }

  async readMedia(lessonId: string, filename: string, token: string) {
    const safeName = basename(filename);
    if (safeName !== filename || !token) {
      throw new ForbiddenException('Mídia não autorizada');
    }

    const session = await this.prisma.videoWatchSession.findUnique({
      where: { token },
      include: { lesson: true },
    });
    if (
      !session ||
      session.lessonId !== lessonId ||
      session.endedAt ||
      session.expiresAt <= new Date()
    ) {
      throw new ForbiddenException('Link de mídia inválido ou expirado');
    }

    const assetKey = session.lesson.videoAssetKey;
    if (!assetKey) throw new NotFoundException('Vídeo não encontrado');

    const filePath = join(this.storageRoot, lessonId, assetKey, safeName);
    if (!existsSync(filePath)) throw new NotFoundException('Arquivo de mídia não encontrado');

    const extension = extname(safeName).toLowerCase();
    if (extension === '.m3u8') {
      const text = readFileSync(filePath, 'utf8')
        .split('\n')
        .map((line) => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) return line;
          return trimmed + '?token=' + encodeURIComponent(token);
        })
        .join('\n');
      return {
        body: Buffer.from(text),
        contentType: 'application/vnd.apple.mpegurl',
        cacheControl: 'no-store',
      };
    }

    if (!['.ts', '.m4s', '.mp4'].includes(extension)) {
      throw new ForbiddenException('Tipo de mídia não permitido');
    }

    return {
      body: readFileSync(filePath),
      contentType:
        extension === '.ts'
          ? 'video/mp2t'
          : extension === '.m4s'
            ? 'video/iso.segment'
            : 'video/mp4',
      cacheControl: 'private, max-age=300',
    };
  }

  private async completeCourseIfEligible(userId: string, lessonId: string) {
    const lesson = await this.prisma.courseLesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          include: {
            course: {
              include: {
                qualification: true,
                modules: {
                  where: { active: true },
                  include: { lessons: { where: { active: true } } },
                },
              },
            },
          },
        },
      },
    });
    if (!lesson) return;

    const course = lesson.module.course;
    const lessonIds = course.modules.flatMap((module) =>
      module.lessons.map((item) => item.id),
    );
    if (!lessonIds.length) return;

    const completedCount = await this.prisma.courseLessonProgress.count({
      where: {
        userId,
        lessonId: { in: lessonIds },
        completedAt: { not: null },
      },
    });
    if (completedCount !== lessonIds.length || !course.qualificationId) return;

    const current = await this.prisma.userQualification.findUnique({
      where: {
        userId_qualificationId: {
          userId,
          qualificationId: course.qualificationId,
        },
      },
    });
    if (current?.status === QualificationStatus.COMPLETED) return;

    const now = new Date();
    await this.prisma.userQualification.upsert({
      where: {
        userId_qualificationId: {
          userId,
          qualificationId: course.qualificationId,
        },
      },
      create: {
        userId,
        qualificationId: course.qualificationId,
        status: QualificationStatus.COMPLETED,
        completedAt: now,
        evaluatedAt: now,
        notes: 'Concluído automaticamente pelo curso interno da Trilha.',
      },
      update: {
        status: QualificationStatus.COMPLETED,
        completedAt: now,
        evaluatedAt: now,
        notes: 'Concluído automaticamente pelo curso interno da Trilha.',
      },
    });

    await this.notifications.create({
      userId,
      type: NotificationType.QUALIFICATION_EVALUATED,
      title: 'Curso concluído',
      message: 'Você concluiu ' + course.title + ' e a qualificação foi validada automaticamente.',
      href: '/meu-pdi',
      metadata: { courseId: course.id, qualificationId: course.qualificationId },
    });
  }

  private async assertUserCourseAccess(courseId: string, userId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        qualification: true,
        modules: {
          where: { active: true },
          orderBy: { order: 'asc' },
          include: {
            lessons: { where: { active: true }, orderBy: { order: 'asc' } },
          },
        },
      },
    });
    if (!course || !course.active || !course.qualificationId) {
      throw new NotFoundException('Curso não encontrado');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        roleId: true,
        currentRoleStep: { select: { order: true } },
        qualifications: {
          where: { qualificationId: course.qualificationId },
          select: { status: true },
        },
      },
    });
    if (!user?.roleId || !user.currentRoleStep) {
      throw new ForbiddenException('Seu cargo atual ainda não permite acessar este curso');
    }

    const alreadyCompleted =
      user.qualifications[0]?.status === QualificationStatus.COMPLETED;

    const nextStep = await this.prisma.roleStep.findFirst({
      where: {
        roleId: user.roleId,
        active: true,
        order: { gt: user.currentRoleStep.order },
      },
      orderBy: { order: 'asc' },
      select: { id: true },
    });

    const required =
      nextStep &&
      (await this.prisma.roleStepQualification.findUnique({
        where: {
          roleStepId_qualificationId: {
            roleStepId: nextStep.id,
            qualificationId: course.qualificationId,
          },
        },
        select: { required: true },
      }));

    if (!alreadyCompleted && !required?.required) {
      throw new ForbiddenException('Este curso não faz parte da sua Trilha atual');
    }

    return course;
  }

  private async assertManageQualification(qualificationId: string, actor: Actor) {
    const qualification = await this.prisma.qualification.findUnique({
      where: { id: qualificationId },
      select: { id: true, type: true, teamId: true, active: true },
    });
    if (!qualification?.active) throw new NotFoundException('Qualificação não encontrada');
    if (qualification.type !== QualificationType.COURSE) {
      throw new BadRequestException('O curso precisa estar vinculado a uma qualificação do tipo Curso');
    }
    await this.assertCanManageCourse(actor, qualification.teamId);
    return qualification;
  }

  private async assertCanManageCourse(actor: Actor, teamId: string | null) {
    if (actor.systemRole === SystemRole.ADMIN) return;
    if (actor.systemRole !== SystemRole.MANAGER) {
      throw new ForbiddenException('Apenas administradores e gerentes podem gerenciar cursos');
    }
    const actorTeamId = await this.getActorTeamId(actor.sub);
    if (!teamId || actorTeamId !== teamId) {
      throw new ForbiddenException('Gerentes só podem gerenciar cursos do próprio time');
    }
  }

  private async getActorTeamId(actorId: string) {
    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: { teamId: true, active: true },
    });
    if (!actor?.active) throw new ForbiddenException('Usuário responsável não encontrado ou inativo');
    return actor.teamId;
  }
}
