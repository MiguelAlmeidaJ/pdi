import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { CreateRoleDto } from './dto/create-role.dto';
import { RolesService } from './roles.service';
import { SetStepRequirementsDto } from './dto/set-step-requirements.dto';

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
  @Roles(SystemRole.ADMIN, SystemRole.MANAGER)
  @Get('steps/:stepId/requirements')
  getStepRequirements(@Param('stepId') stepId: string) { return this.service.getStepRequirements(stepId); }

  @Roles(SystemRole.ADMIN)
  @Put('steps/:stepId/requirements')
  setStepRequirements(@Param('stepId') stepId: string, @Body() dto: SetStepRequirementsDto) {
    return this.service.setStepRequirements(stepId, dto);
  }
}
