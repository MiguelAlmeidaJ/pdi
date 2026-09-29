import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { QualificationStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { SetUserQualificationDto } from './dto/set-user-qualification.dto';

@Injectable()
export class UserQualificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async set(userId: string, qualificationId: string, dto: SetUserQualificationDto, evaluatorId: string) {
    const [user, qualification] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.qualification.findUnique({ where: { id: qualificationId } }),
    ]);
    if (!user) throw new NotFoundException('Usuário não encontrado');
    if (!qualification || !qualification.active) throw new NotFoundException('Qualificação não encontrada ou inativa');
    if (qualification.teamId && qualification.teamId !== user.teamId) {
      throw new BadRequestException('A qualificação deve pertencer ao mesmo time do colaborador');
    }

    if (dto.status === QualificationStatus.REJECTED && !dto.notes?.trim()) {
      throw new BadRequestException('Informe uma observação ao rejeitar uma qualificação');
    }

    const completedAt =
      dto.status === QualificationStatus.COMPLETED
        ? dto.completedAt
          ? new Date(dto.completedAt)
          : new Date()
        : null;

    return this.prisma.userQualification.upsert({
      where: { userId_qualificationId: { userId, qualificationId } },
      create: {
        userId,
        qualificationId,
        status: dto.status,
        completedAt,
        evidenceUrl: dto.evidenceUrl || null,
        notes: dto.notes?.trim() || null,
        evaluatorId,
        evaluatedAt: new Date(),
      },
      update: {
        status: dto.status,
        completedAt,
        evidenceUrl: dto.evidenceUrl || null,
        notes: dto.notes?.trim() || null,
        evaluatorId,
        evaluatedAt: new Date(),
      },
      include: {
        qualification: true,
        evaluator: { select: { id: true, name: true, email: true } },
      },
    });
  }

  findAll(userId: string) {
    return this.prisma.userQualification.findMany({
      where: { userId },
      include: {
        qualification: true,
        evaluator: { select: { id: true, name: true, email: true } },
      },
      orderBy: { qualification: { name: 'asc' } },
    });
  }
}
