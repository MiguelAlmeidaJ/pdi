import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateQualificationDto } from './dto/create-qualification.dto';
import { UpdateQualificationDto } from './dto/update-qualification.dto';

@Injectable()
export class QualificationsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(teamId?: string) {
    return this.prisma.qualification.findMany({
      where: teamId ? { teamId } : undefined,
      include: {
        team: { select: { id: true, name: true } },
        _count: { select: { roleStepRequirements: true, userQualifications: true } },
      },
      orderBy: [{ team: { name: 'asc' } }, { type: 'asc' }, { name: 'asc' }],
    });
  }

  async create(dto: CreateQualificationDto) {
    const name = dto.name.trim();
    const team = await this.prisma.team.findUnique({ where: { id: dto.teamId } });
    if (!team) throw new NotFoundException('Time não encontrado');

    const exists = await this.prisma.qualification.findFirst({
      where: { teamId: dto.teamId, name, type: dto.type },
    });
    if (exists) throw new ConflictException('Qualificação já cadastrada neste time');

    return this.prisma.qualification.create({
      data: {
        teamId: dto.teamId,
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
