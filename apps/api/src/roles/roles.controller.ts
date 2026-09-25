import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { CreateRoleDto } from './dto/create-role.dto';
import { RolesService } from './roles.service';

@ApiTags('roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly service: RolesService) {}

  @Roles(SystemRole.ADMIN, SystemRole.MANAGER)
  @Get()
  findAll(@Query('teamId') teamId?: string) { return this.service.findAll(teamId); }

  @Roles(SystemRole.ADMIN)
  @Post()
  create(@Body() dto: CreateRoleDto) { return this.service.create(dto); }
}
