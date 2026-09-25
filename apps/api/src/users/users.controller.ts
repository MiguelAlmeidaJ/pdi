import { Body, Controller, Get, Post } from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Roles(SystemRole.ADMIN, SystemRole.MANAGER)
  @Get()
  findAll() { return this.users.findAll(); }

  @Roles(SystemRole.ADMIN)
  @Post()
  create(@Body() dto: CreateUserDto) { return this.users.create(dto); }
}
