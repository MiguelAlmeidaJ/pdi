import { Body, Controller, Get, Param, Post, Put, Request } from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { SetUserQualificationDto } from './dto/set-user-qualification.dto';
import { ChangeCareerStepDto } from './dto/change-career-step.dto';
import { UsersService } from './users.service';
import { DevelopmentService } from './development.service';
import { UserQualificationsService } from './user-qualifications.service';

type AuthenticatedRequest = {
  user: {
    sub: string;
    email: string;
    systemRole: SystemRole;
  };
};

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly development: DevelopmentService,
    private readonly userQualifications: UserQualificationsService,
  ) {}

  @Roles(SystemRole.ADMIN, SystemRole.MANAGER)
  @Get()
  findAll(@Request() request: AuthenticatedRequest) {
    return this.users.findAll(request.user);
  }

  @Roles(SystemRole.ADMIN)
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  @Roles(SystemRole.ADMIN, SystemRole.MANAGER)
  @Get(':id')
  findOne(@Param('id') id: string, @Request() request: AuthenticatedRequest) {
    return this.users.findOne(id, request.user);
  }

  @Roles(SystemRole.ADMIN, SystemRole.MANAGER)
  @Put(':id/career-step')
  changeCareerStep(
    @Param('id') id: string,
    @Body() dto: ChangeCareerStepDto,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.users.changeCareerStep(id, dto, request.user);
  }

  @Roles(SystemRole.ADMIN, SystemRole.MANAGER)
  @Get(':id/development')
  async getDevelopment(@Param('id') id: string, @Request() request: AuthenticatedRequest) {
    await this.users.assertCanAccessUser(request.user, id);
    return this.development.getDevelopment(id);
  }

  @Roles(SystemRole.ADMIN, SystemRole.MANAGER)
  @Get(':id/qualifications')
  async getQualifications(@Param('id') id: string, @Request() request: AuthenticatedRequest) {
    await this.users.assertCanAccessUser(request.user, id);
    return this.userQualifications.findAll(id);
  }

  @Roles(SystemRole.ADMIN, SystemRole.MANAGER)
  @Put(':id/qualifications/:qualificationId')
  async setQualification(
    @Param('id') id: string,
    @Param('qualificationId') qualificationId: string,
    @Body() dto: SetUserQualificationDto,
    @Request() request: AuthenticatedRequest,
  ) {
    await this.users.assertCanAccessUser(request.user, id);
    return this.userQualifications.set(id, qualificationId, dto);
  }
}
