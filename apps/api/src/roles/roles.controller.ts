import { Body, Controller, Get, Param, Post, Put, Query, Request } from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolesService } from './roles.service';
import { SetStepRequirementsDto } from './dto/set-step-requirements.dto';

@ApiTags('roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly service: RolesService) {}

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
    @Body() dto: CreateRoleDto,
    @Request() request: { user: { sub: string; systemRole: SystemRole } },
  ) {
    return this.service.create(dto, request.user);
  }

  @Roles(SystemRole.ADMIN, SystemRole.MANAGER)
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @Request() request: { user: { sub: string; systemRole: SystemRole } },
  ) {
    return this.service.update(id, dto, request.user);
  }
  @Roles(SystemRole.ADMIN, SystemRole.MANAGER)
  @Get('steps/:stepId/requirements')
  getStepRequirements(
    @Param('stepId') stepId: string,
    @Request() request: { user: { sub: string; systemRole: SystemRole } },
  ) {
    return this.service.getStepRequirements(stepId, request.user);
  }

  @Roles(SystemRole.ADMIN, SystemRole.MANAGER)
  @Put('steps/:stepId/requirements')
  setStepRequirements(
    @Param('stepId') stepId: string,
    @Body() dto: SetStepRequirementsDto,
    @Request() request: { user: { sub: string; systemRole: SystemRole } },
  ) {
    return this.service.setStepRequirements(stepId, dto, request.user);
  }
}
