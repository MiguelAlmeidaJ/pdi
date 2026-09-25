import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateQualificationDto } from './dto/create-qualification.dto';
import { UpdateQualificationDto } from './dto/update-qualification.dto';

@Injectable()
export class QualificationsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.qualification.findMany({
      include: { _count: { select: { roleStepRequirements: true, userQualifications: true } } },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
  }

  async create(dto: CreateQualificationDto) {
    const name = dto.name.trim();
    const exists = await this.prisma.qualification.findUnique({
      where: { name_type: { name, type: dto.type } },
    });
    if (exists) throw new ConflictException('Qualificação já cadastrada');
    return this.prisma.qualification.create({
      data: { name, type: dto.type, description: dto.description?.trim(), referenceUrl: dto.referenceUrl },
    });
  }

  async update(id: string, dto: UpdateQualificationDto) {
    const current = await this.prisma.qualification.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Qualificação não encontrada');
    const name = dto.name?.trim() ?? current.name;
    const type = dto.type ?? current.type;
    const duplicate = await this.prisma.qualification.findUnique({ where: { name_type: { name, type } } });
    if (duplicate && duplicate.id !== id) throw new ConflictException('Qualificação já cadastrada');
    return this.prisma.qualification.update({
      where: { id },
      data: {
        name: dto.name?.trim(), type: dto.type, description: dto.description?.trim(),
        referenceUrl: dto.referenceUrl, active: dto.active,
      },
    });
  }
}
