import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
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
  findAll() { return this.service.findAll(); }

  @Roles(SystemRole.ADMIN)
  @Post()
  create(@Body() dto: CreateQualificationDto) { return this.service.create(dto); }

  @Roles(SystemRole.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateQualificationDto) { return this.service.update(id, dto); }
}
