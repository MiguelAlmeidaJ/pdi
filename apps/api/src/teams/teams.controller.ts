import { Body, Controller, Delete, Get, Param, Post, Request } from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { CreateTeamDto } from './dto/create-team.dto';
import { TeamsService } from './teams.service';

@ApiTags('teams')
@ApiBearerAuth()
@Controller('teams')
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @Roles(SystemRole.ADMIN, SystemRole.MANAGER)
  @Get()
  findAll(@Request() request: { user: { sub: string; systemRole: SystemRole } }) {
    return this.teams.findAll(request.user);
  }

  @Roles(SystemRole.ADMIN)
  @Post()
  create(@Body() dto: CreateTeamDto) { return this.teams.create(dto); }

  @Roles(SystemRole.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) { return this.teams.remove(id); }
}
