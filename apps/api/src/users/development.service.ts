import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { QualificationStatus, QualificationType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

function completedMonths(from: Date, to: Date) {
  let months = (to.getFullYear() - from.getFullYear()) * 12 + to.getMonth() - from.getMonth();
  if (to.getDate() < from.getDate()) months -= 1;
  return Math.max(0, months);
}

@Injectable()
export class DevelopmentService {
  constructor(private readonly prisma: PrismaService) {}

  async getDevelopment(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
        currentRoleStep: true,
        qualifications: { include: { qualification: true } },
      },
    });

    if (!user) throw new NotFoundException('Usuário não encontrado');
    if (!user.role || !user.currentRoleStep) {
      throw new BadRequestException('Usuário ainda não possui cargo e step atual configurados');
    }

    const nextStep = await this.prisma.roleStep.findFirst({
      where: {
        roleId: user.role.id,
        active: true,
        order: { gt: user.currentRoleStep.order },
      },
      orderBy: { order: 'asc' },
      include: {
        requirements: {
          where: { required: true },
          include: { qualification: true },
          orderBy: { qualification: { name: 'asc' } },
        },
      },
    });

    if (!nextStep) {
      return {
        current: this.current(user),
        next: null,
        progress: { required: 0, completed: 0, percentage: 100 },
        requirements: [],
        eligibleForPromotion: false,
        careerComplete: true,
      };
    }

    const now = new Date();
    const requirements: Array<Record<string, unknown>> = [];

    if (nextStep.minTenureMonths != null) {
      const currentMonths = completedMonths(user.hiredAt, now);
      requirements.push({
        key: 'tenure',
        name: 'Tempo de casa',
        type: QualificationType.TENURE,
        requiredMonths: nextStep.minTenureMonths,
        currentMonths,
        met: currentMonths >= nextStep.minTenureMonths,
      });
    }

    if (nextStep.minExperienceMonths != null) {
      const currentMonths = user.professionalSince ? completedMonths(user.professionalSince, now) : 0;
      requirements.push({
        key: 'experience',
        name: 'Experiência profissional',
        type: QualificationType.EXPERIENCE,
        requiredMonths: nextStep.minExperienceMonths,
        currentMonths,
        met: currentMonths >= nextStep.minExperienceMonths,
      });
    }

    const completed = new Map(
      user.qualifications.map((uq) => [uq.qualificationId, uq]),
    );

    for (const requirement of nextStep.requirements) {
      const userQualification = completed.get(requirement.qualificationId);
      requirements.push({
        key: requirement.qualificationId,
        name: requirement.qualification.name,
        type: requirement.qualification.type,
        description: requirement.qualification.description,
        referenceUrl: requirement.qualification.referenceUrl,
        notes: requirement.notes,
        status: userQualification?.status ?? QualificationStatus.PENDING,
        evidenceUrl: userQualification?.evidenceUrl ?? null,
        completedAt: userQualification?.completedAt ?? null,
        met: userQualification?.status === QualificationStatus.COMPLETED,
      });
    }

    const required = requirements.length;
    const completedCount = requirements.filter((item) => item.met === true).length;

    return {
      current: this.current(user),
      next: {
        id: nextStep.id,
        code: nextStep.code,
        label: nextStep.label,
        salary: nextStep.salary,
        minTenureMonths: nextStep.minTenureMonths,
        minExperienceMonths: nextStep.minExperienceMonths,
      },
      progress: {
        required,
        completed: completedCount,
        percentage: required === 0 ? 100 : Math.round((completedCount / required) * 100),
      },
      requirements,
      eligibleForPromotion: completedCount === required,
      careerComplete: false,
    };
  }

  private current(user: any) {
    return {
      role: { id: user.role.id, name: user.role.name },
      step: {
        id: user.currentRoleStep.id,
        code: user.currentRoleStep.code,
        label: user.currentRoleStep.label,
      },
      salary: user.currentRoleStep.salary,
    };
  }
}
