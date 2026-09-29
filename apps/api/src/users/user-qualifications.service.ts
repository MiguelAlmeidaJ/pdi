import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, QualificationStatus, SystemRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { SetUserQualificationDto } from './dto/set-user-qualification.dto';
import { SubmitQualificationDto } from './dto/submit-qualification.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class UserQualificationsService {
  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService) {}

  async set(userId: string, qualificationId: string, dto: SetUserQualificationDto, evaluatorId: string) {
    const [user, qualification] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, teamId: true, managerId: true } }),
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

    const result = await this.prisma.userQualification.upsert({
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

    const statusText: Record<string, string> = {
      COMPLETED: 'foi concluída',
      REJECTED: 'precisa ser revisada',
      IN_PROGRESS: 'foi marcada como em andamento',
      PENDING: 'voltou para pendente',
    };

    await this.notifications.create({
      userId,
      type: NotificationType.QUALIFICATION_EVALUATED,
      title: 'Qualificação avaliada',
      message: qualification.name + ' ' + (statusText[dto.status] ?? 'foi atualizada'),
      href: '/meu-pdi',
      metadata: {
        qualificationId,
        status: dto.status,
        evaluatorId,
      },
    });

    return result;
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

    const result = await this.prisma.userQualification.upsert({
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

    let recipientIds: string[] = [];
    if (user.managerId) {
      recipientIds = [user.managerId];
    } else {
      const managers = await this.prisma.user.findMany({
        where: { teamId: user.teamId, systemRole: SystemRole.MANAGER, active: true },
        select: { id: true },
      });
      recipientIds = managers.map((manager) => manager.id);
    }

    await this.notifications.createMany(recipientIds.map((recipientId) => ({
      userId: recipientId,
      type: NotificationType.QUALIFICATION_SUBMITTED,
      title: 'Nova evidência para avaliar',
      message: qualification.name + ' foi enviada para avaliação',
      href: '/avaliacoes',
      metadata: {
        collaboratorId: userId,
        qualificationId,
      },
    })));

    return result;
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
