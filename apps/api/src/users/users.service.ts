import { ConflictException, Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        systemRole: true,
        active: true,
        hiredAt: true,
        professionalSince: true,
        team: { select: { id: true, name: true } },
        role: { select: { id: true, name: true } },
        currentRoleStep: { select: { id: true, code: true, label: true, salary: true, order: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        systemRole: true,
        active: true,
        hiredAt: true,
        professionalSince: true,
        team: { select: { id: true, name: true } },
        role: { select: { id: true, name: true, description: true } },
        currentRoleStep: { select: { id: true, code: true, label: true, salary: true, order: true } },
        manager: { select: { id: true, name: true, email: true } },
      },
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
