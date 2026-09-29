import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { QualificationStatus, SystemRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { SetUserQualificationDto } from './dto/set-user-qualification.dto';
import { SubmitQualificationDto } from './dto/submit-qualification.dto';

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

    if (dto.status === QualificationStatus.AWAITING_REVIEW) {
      throw new BadRequestException('O status de aguardando avaliação só pode ser enviado pelo colaborador');
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

  async submitByUser(userId: string, qualificationId: string, dto: SubmitQualificationDto) {
    const [user, qualification] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        include: { role: true, currentRoleStep: true },
      }),
      this.prisma.qualification.findUnique({ where: { id: qualificationId } }),
    ]);

    if (!user) throw new NotFoundException('Usuário não encontrado');
    if (!qualification || !qualification.active) throw new NotFoundException('Qualificação não encontrada ou inativa');
    if (qualification.teamId && qualification.teamId !== user.teamId) {
      throw new BadRequestException('A qualificação deve pertencer ao seu time');
    }
    if (!user.roleId || !user.currentRoleStep) {
      throw new BadRequestException('Seu cargo e step atual precisam estar configurados');
    }

    const nextStep = await this.prisma.roleStep.findFirst({
      where: {
        roleId: user.roleId,
        active: true,
        order: { gt: user.currentRoleStep.order },
      },
      orderBy: { order: 'asc' },
      select: { id: true },
    });

    if (!nextStep) throw new BadRequestException('Você já está no último step do cargo');

    const required = await this.prisma.roleStepQualification.findUnique({
      where: {
        roleStepId_qualificationId: {
          roleStepId: nextStep.id,
          qualificationId,
        },
      },
    });

    if (!required?.required) {
      throw new BadRequestException('Esta qualificação não é requisito do seu próximo step');
    }

    const existing = await this.prisma.userQualification.findUnique({
      where: { userId_qualificationId: { userId, qualificationId } },
    });

    if (existing?.status === QualificationStatus.COMPLETED) {
      throw new BadRequestException('Esta qualificação já foi concluída');
    }

    return this.prisma.userQualification.upsert({
      where: { userId_qualificationId: { userId, qualificationId } },
      create: {
        userId,
        qualificationId,
        status: QualificationStatus.AWAITING_REVIEW,
        evidenceUrl: dto.evidenceUrl,
        submissionNotes: dto.notes?.trim() || null,
        submittedAt: new Date(),
        evaluatorId: null,
        evaluatedAt: null,
      },
      update: {
        status: QualificationStatus.AWAITING_REVIEW,
        evidenceUrl: dto.evidenceUrl,
        submissionNotes: dto.notes?.trim() || null,
        submittedAt: new Date(),
        evaluatorId: null,
        evaluatedAt: null,
        completedAt: null,
      },
      include: {
        qualification: true,
        evaluator: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async countPendingReviews(actor: { sub: string; systemRole: SystemRole }) {
    let teamId: string | undefined;

    if (actor.systemRole === SystemRole.MANAGER) {
      const manager = await this.prisma.user.findUnique({
        where: { id: actor.sub },
        select: { teamId: true, active: true },
      });
      if (!manager?.active) throw new ForbiddenException('Gerente não encontrado ou inativo');
      teamId = manager.teamId;
    }

    const count = await this.prisma.userQualification.count({
      where: {
        status: QualificationStatus.AWAITING_REVIEW,
        user: teamId ? { teamId } : undefined,
      },
    });

    return { count };
  }

  async findPendingReviews(actor: { sub: string; systemRole: SystemRole }) {
    let teamId: string | undefined;

    if (actor.systemRole === SystemRole.MANAGER) {
      const manager = await this.prisma.user.findUnique({
        where: { id: actor.sub },
        select: { teamId: true, active: true },
      });
      if (!manager?.active) throw new ForbiddenException('Gerente não encontrado ou inativo');
      teamId = manager.teamId;
    }

    return this.prisma.userQualification.findMany({
      where: {
        status: QualificationStatus.AWAITING_REVIEW,
        user: teamId ? { teamId } : undefined,
      },
      include: {
        qualification: {
          select: { id: true, name: true, type: true, description: true },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            team: { select: { id: true, name: true } },
            role: { select: { id: true, name: true } },
            currentRoleStep: { select: { id: true, label: true, code: true, order: true } },
          },
        },
      },
      orderBy: [{ submittedAt: 'asc' }, { user: { name: 'asc' } }],
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
