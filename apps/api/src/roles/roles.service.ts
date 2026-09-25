import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { StepCode } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(teamId?: string) {
    return this.prisma.role.findMany({
      where: teamId ? { teamId } : undefined,
      include: { team: true, steps: { orderBy: { order: 'asc' } }, _count: { select: { users: true } } },
      orderBy: [{ team: { name: 'asc' } }, { name: 'asc' }],
    });
  }

  async create(dto: CreateRoleDto) {
    if (!dto.steps.some((s) => s.code === StepCode.BASE)) throw new BadRequestException('Todo cargo deve possuir o step BASE');
    if (dto.steps.filter((s) => s.code === StepCode.BASE).length !== 1) throw new BadRequestException('O cargo deve possuir exatamente um step BASE');
    const codes = new Set(dto.steps.map((s) => s.code));
    const orders = new Set(dto.steps.map((s) => s.order));
    if (codes.size !== dto.steps.length || orders.size !== dto.steps.length) throw new BadRequestException('Steps não podem repetir código ou ordem');
    if (!(await this.prisma.team.findUnique({ where: { id: dto.teamId } }))) throw new NotFoundException('Time não encontrado');
    if (await this.prisma.role.findUnique({ where: { teamId_name: { teamId: dto.teamId, name: dto.name.trim() } } })) throw new ConflictException('Cargo já cadastrado neste time');

    return this.prisma.role.create({
      data: {
        name: dto.name.trim(), description: dto.description?.trim(), teamId: dto.teamId,
        steps: { create: dto.steps.map((s) => ({ ...s, salary: s.salary.toString() })) },
      },
      include: { steps: { orderBy: { order: 'asc' } } },
    });
  }
}
