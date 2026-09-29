import { Body, Controller, Get, Param, Patch, Post, Query, Request } from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { CreateQualificationDto } from './dto/create-qualification.dto';
import { UpdateQualificationDto } from './dto/update-qualification.dto';
import { QualificationsService } from './qualifications.service';

@ApiTags('qualifications')
@ApiBearerAuth()
@Controller('qualifications')
export class QualificationsController {
  constructor(private readonly service: QualificationsService) {}

  @Roles(SystemRole.ADMIN, SystemRole.MANAGER)
  @Get()
  findAll(
    @Request() request: { user: { sub: string; systemRole: SystemRole } },
    @Query('teamId') teamId?: string,
  ) {
    return this.service.findAll(request.user, teamId);
  }

  @Roles(SystemRole.ADMIN, SystemRole.MANAGER)
  @Post()
  create(
    @Body() dto: CreateQualificationDto,
    @Request() request: { user: { sub: string; systemRole: SystemRole } },
  ) {
    return this.service.create(dto, request.user);
  }

  @Roles(SystemRole.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateQualificationDto) { return this.service.update(id, dto); }
}
