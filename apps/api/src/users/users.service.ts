import { ConflictException, Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({
      select: { id: true, name: true, email: true, systemRole: true, active: true, hiredAt: true, teamId: true, roleId: true, currentRoleStepId: true },
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateUserDto) {
    const email = dto.email.toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) throw new ConflictException('E-mail já cadastrado');
    const passwordHash = await argon2.hash(dto.password);
    return this.prisma.user.create({
      data: {
        name: dto.name, email, passwordHash, systemRole: dto.systemRole,
        hiredAt: new Date(dto.hiredAt),
        professionalSince: dto.professionalSince ? new Date(dto.professionalSince) : undefined,
        teamId: dto.teamId, roleId: dto.roleId, currentRoleStepId: dto.currentRoleStepId, managerId: dto.managerId,
      },
      select: { id: true, name: true, email: true, systemRole: true, active: true, hiredAt: true },
    });
  }
}
