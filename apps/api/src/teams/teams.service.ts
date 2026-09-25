import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.team.findMany({
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
