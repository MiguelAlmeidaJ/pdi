import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(actor: { sub: string; systemRole: SystemRole }) {
    let teamId: string | undefined;

    if (actor.systemRole === SystemRole.MANAGER) {
      const manager = await this.prisma.user.findUnique({
        where: { id: actor.sub },
        select: { teamId: true, active: true },
      });
      if (!manager?.active) throw new NotFoundException('Gerente não encontrado ou inativo');
      teamId = manager.teamId;
    }

    return this.prisma.team.findMany({
      where: teamId ? { id: teamId } : undefined,
      include: { _count: { select: { users: true, roles: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateTeamDto) {
    const slug = dto.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (!slug) throw new ConflictException('Nome de time inválido');
    if (await this.prisma.team.findUnique({ where: { slug } })) throw new ConflictException('Time já cadastrado');
    return this.prisma.team.create({ data: { name: dto.name.trim(), slug } });
  }

  async remove(id: string) {
    const team = await this.prisma.team.findUnique({ where: { id }, include: { _count: { select: { users: true, roles: true } } } });
    if (!team) throw new NotFoundException('Time não encontrado');
    if (team._count.users || team._count.roles) throw new ConflictException('Não é possível excluir um time que possui usuários ou cargos');
    await this.prisma.team.delete({ where: { id } });
    return { deleted: true };
  }
}
