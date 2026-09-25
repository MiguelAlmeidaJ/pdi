import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { SetUserQualificationDto } from './dto/set-user-qualification.dto';
import { UsersService } from './users.service';
import { DevelopmentService } from './development.service';
import { UserQualificationsService } from './user-qualifications.service';

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
  findAll() { return this.users.findAll(); }

  @Roles(SystemRole.ADMIN)
  @Post()
  create(@Body() dto: CreateUserDto) { return this.users.create(dto); }

  @Roles(SystemRole.ADMIN, SystemRole.MANAGER)
  @Get(':id')
  findOne(@Param('id') id: string) { return this.users.findOne(id); }

  @Roles(SystemRole.ADMIN, SystemRole.MANAGER)
  @Get(':id/development')
  getDevelopment(@Param('id') id: string) { return this.development.getDevelopment(id); }

  @Roles(SystemRole.ADMIN, SystemRole.MANAGER)
  @Get(':id/qualifications')
  getQualifications(@Param('id') id: string) { return this.userQualifications.findAll(id); }

  @Roles(SystemRole.ADMIN, SystemRole.MANAGER)
  @Put(':id/qualifications/:qualificationId')
  setQualification(
    @Param('id') id: string,
    @Param('qualificationId') qualificationId: string,
    @Body() dto: SetUserQualificationDto,
  ) {
    return this.userQualifications.set(id, qualificationId, dto);
  }
}
