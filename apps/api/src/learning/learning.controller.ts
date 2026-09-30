import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Request,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { SystemRole } from '@prisma/client';
import { tmpdir } from 'os';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CreateCourseModuleDto } from './dto/create-module.dto';
import { UpdateCourseModuleDto } from './dto/update-module.dto';
import { CreateCourseLessonDto } from './dto/create-lesson.dto';
import { UpdateCourseLessonDto } from './dto/update-lesson.dto';
import { LessonHeartbeatDto } from './dto/heartbeat.dto';
import { LearningService } from './learning.service';

type AuthenticatedRequest = {
  user: { sub: string; email: string; systemRole: SystemRole };
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: { remoteAddress?: string };
};

@ApiTags('learning')
@ApiBearerAuth()
@Controller('learning')
export class LearningController {
  constructor(private readonly learning: LearningService) {}

  @Roles(SystemRole.ADMIN, SystemRole.MANAGER)
  @Get('courses')
  listCourses(@Request() request: AuthenticatedRequest) {
    return this.learning.listCourses(request.user);
  }

  @Roles(SystemRole.ADMIN, SystemRole.MANAGER)
  @Post('courses')
  createCourse(
    @Body() dto: CreateCourseDto,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.learning.createCourse(dto, request.user);
  }

  @Roles(SystemRole.ADMIN, SystemRole.MANAGER)
  @Get('courses/:id')
  getCourse(
    @Param('id') id: string,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.learning.getCourse(id, request.user);
  }

  @Roles(SystemRole.ADMIN, SystemRole.MANAGER)
  @Patch('courses/:id')
  updateCourse(
    @Param('id') id: string,
    @Body() dto: UpdateCourseDto,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.learning.updateCourse(id, dto, request.user);
  }

  @Roles(SystemRole.ADMIN, SystemRole.MANAGER)
  @Post('courses/:courseId/modules')
  createModule(
    @Param('courseId') courseId: string,
    @Body() dto: CreateCourseModuleDto,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.learning.createModule(courseId, dto, request.user);
  }

  @Roles(SystemRole.ADMIN, SystemRole.MANAGER)
  @Patch('modules/:id')
  updateModule(
    @Param('id') id: string,
    @Body() dto: UpdateCourseModuleDto,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.learning.updateModule(id, dto, request.user);
  }

  @Roles(SystemRole.ADMIN, SystemRole.MANAGER)
  @Post('modules/:moduleId/lessons')
  createLesson(
    @Param('moduleId') moduleId: string,
    @Body() dto: CreateCourseLessonDto,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.learning.createLesson(moduleId, dto, request.user);
  }

  @Roles(SystemRole.ADMIN, SystemRole.MANAGER)
  @Patch('lessons/:id')
  updateLesson(
    @Param('id') id: string,
    @Body() dto: UpdateCourseLessonDto,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.learning.updateLesson(id, dto, request.user);
  }

  @Roles(SystemRole.ADMIN, SystemRole.MANAGER)
  @Post('lessons/:id/video')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      dest: tmpdir(),
      limits: { fileSize: 2 * 1024 * 1024 * 1024 },
    }),
  )
  uploadLessonVideo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.learning.queueVideoProcessing(id, file, request.user);
  }

  @Roles(SystemRole.USER)
  @Get('my/courses/:id')
  getMyCourse(
    @Param('id') id: string,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.learning.getMyCourse(id, request.user.sub);
  }

  @Roles(SystemRole.USER)
  @Post('lessons/:id/session')
  startSession(
    @Param('id') id: string,
    @Request() request: AuthenticatedRequest,
  ) {
    const userAgentHeader = request.headers['user-agent'];
    const userAgent = Array.isArray(userAgentHeader)
      ? userAgentHeader.join(' ')
      : userAgentHeader;

    return this.learning.startSession(id, request.user.sub, {
      userAgent,
      ipAddress: request.ip || request.socket?.remoteAddress,
    });
  }

  @Roles(SystemRole.USER)
  @Put('sessions/:id/heartbeat')
  heartbeat(
    @Param('id') id: string,
    @Body() dto: LessonHeartbeatDto,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.learning.heartbeat(id, request.user.sub, dto);
  }

  @Roles(SystemRole.USER)
  @Post('sessions/:id/end')
  endSession(
    @Param('id') id: string,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.learning.endSession(id, request.user.sub);
  }

  @Public()
  @Get('media/:lessonId/:filename')
  async media(
    @Param('lessonId') lessonId: string,
    @Param('filename') filename: string,
    @Query('token') token: string,
    @Res({ passthrough: true }) response: any,
  ) {
    const media = await this.learning.readMedia(lessonId, filename, token);
    response.setHeader('Content-Type', media.contentType);
    response.setHeader('Cache-Control', media.cacheControl);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    return new StreamableFile(media.body);
  }
}
