import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateQualificationDto } from './dto/create-qualification.dto';
import { UpdateQualificationDto } from './dto/update-qualification.dto';

@Injectable()
export class QualificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(actor: { sub: string; systemRole: SystemRole }, teamId?: string) {
    let scopedTeamId = teamId;

    if (actor.systemRole === SystemRole.MANAGER) {
      const manager = await this.prisma.user.findUnique({
        where: { id: actor.sub },
        select: { teamId: true, active: true },
      });
      if (!manager?.active) throw new ForbiddenException('Gerente não encontrado ou inativo');
      scopedTeamId = manager.teamId;
    }

    return this.prisma.qualification.findMany({
      where: scopedTeamId ? { teamId: scopedTeamId } : undefined,
      include: {
        team: { select: { id: true, name: true } },
        _count: { select: { roleStepRequirements: true, userQualifications: true } },
      },
      orderBy: [{ team: { name: 'asc' } }, { type: 'asc' }, { name: 'asc' }],
    });
  }

  async create(dto: CreateQualificationDto, actor: { sub: string; systemRole: SystemRole }) {
    const name = dto.name.trim();
    let effectiveTeamId = dto.teamId;

    if (actor.systemRole === SystemRole.MANAGER) {
      const manager = await this.prisma.user.findUnique({
        where: { id: actor.sub },
        select: { teamId: true, active: true },
      });
      if (!manager?.active) throw new ForbiddenException('Gerente não encontrado ou inativo');
      if (dto.teamId !== manager.teamId) {
        throw new ForbiddenException('Gerentes só podem criar qualificações no próprio time');
      }
      effectiveTeamId = manager.teamId;
    }

    const team = await this.prisma.team.findUnique({ where: { id: effectiveTeamId } });
    if (!team) throw new NotFoundException('Time não encontrado');

    const exists = await this.prisma.qualification.findFirst({
      where: { teamId: effectiveTeamId, name, type: dto.type },
    });
    if (exists) throw new ConflictException('Qualificação já cadastrada neste time');

    return this.prisma.qualification.create({
      data: {
        teamId: effectiveTeamId,
        name,
        type: dto.type,
        description: dto.description?.trim(),
        referenceUrl: dto.referenceUrl,
      },
      include: { team: { select: { id: true, name: true } } },
    });
  }

  async update(id: string, dto: UpdateQualificationDto) {
    const current = await this.prisma.qualification.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Qualificação não encontrada');

    const name = dto.name?.trim() ?? current.name;
    const type = dto.type ?? current.type;
    const duplicate = await this.prisma.qualification.findFirst({
      where: { teamId: current.teamId, name, type, NOT: { id } },
    });
    if (duplicate) throw new ConflictException('Qualificação já cadastrada neste time');

    return this.prisma.qualification.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        type: dto.type,
        description: dto.description?.trim(),
        referenceUrl: dto.referenceUrl,
        active: dto.active,
      },
      include: { team: { select: { id: true, name: true } } },
    });
  }
}
