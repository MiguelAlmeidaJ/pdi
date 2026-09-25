import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { QualificationStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { SetUserQualificationDto } from './dto/set-user-qualification.dto';

@Injectable()
export class UserQualificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async set(userId: string, qualificationId: string, dto: SetUserQualificationDto) {
    const [user, qualification] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.qualification.findUnique({ where: { id: qualificationId } }),
    ]);
    if (!user) throw new NotFoundException('Usuário não encontrado');
    if (!qualification || !qualification.active) throw new NotFoundException('Qualificação não encontrada ou inativa');

    if (dto.status === QualificationStatus.COMPLETED && !dto.completedAt) {
      throw new BadRequestException('completedAt é obrigatório quando a qualificação está concluída');
    }

    return this.prisma.userQualification.upsert({
      where: { userId_qualificationId: { userId, qualificationId } },
      create: {
        userId, qualificationId, status: dto.status,
        completedAt: dto.completedAt ? new Date(dto.completedAt) : undefined,
        evidenceUrl: dto.evidenceUrl, notes: dto.notes?.trim(),
      },
      update: {
        status: dto.status,
        completedAt: dto.completedAt ? new Date(dto.completedAt) : null,
        evidenceUrl: dto.evidenceUrl, notes: dto.notes?.trim(),
      },
      include: { qualification: true },
    });
  }

  findAll(userId: string) {
    return this.prisma.userQualification.findMany({
      where: { userId },
      include: { qualification: true },
      orderBy: { qualification: { name: 'asc' } },
    });
  }
}
