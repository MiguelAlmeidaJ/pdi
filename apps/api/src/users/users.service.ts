import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { NotificationType, SystemRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ChangeCareerStepDto } from './dto/change-career-step.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService) {}

  async findAll(actor: { sub: string; systemRole: SystemRole }) {
    const teamId = actor.systemRole === SystemRole.MANAGER ? await this.getActorTeamId(actor.sub) : undefined;
    return this.prisma.user.findMany({
      where: teamId ? { teamId } : undefined,
      select: {
        id: true,
        name: true,
        email: true,
        systemRole: true,
        active: true,
        hiredAt: true,
        professionalSince: true,
        currentRoleStepStartedAt: true,
        team: { select: { id: true, name: true } },
        role: { select: { id: true, name: true } },
        currentRoleStep: { select: { id: true, code: true, label: true, salary: true, order: true } },
        manager: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, actor?: { sub: string; systemRole: SystemRole }) {
    if (actor) await this.assertCanAccessUser(actor, id);
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        systemRole: true,
        active: true,
        hiredAt: true,
        professionalSince: true,
        currentRoleStepStartedAt: true,
        team: { select: { id: true, name: true } },
        role: {
          select: {
            id: true,
            name: true,
            description: true,
            steps: {
              where: { active: true },
              orderBy: { order: 'asc' },
              select: { id: true, code: true, label: true, salary: true, order: true },
            },
          },
        },
        currentRoleStep: { select: { id: true, code: true, label: true, salary: true, order: true } },
        manager: { select: { id: true, name: true, email: true } },
        careerHistory: {
          orderBy: { startedAt: 'desc' },
          take: 10,
          select: {
            id: true,
            startedAt: true,
            endedAt: true,
            reason: true,
            salary: true,
            role: { select: { id: true, name: true } },
            roleStep: { select: { id: true, code: true, label: true, order: true } },
          },
        },
      },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  async create(dto: CreateUserDto, actor: { sub: string; systemRole: SystemRole }) {
    let effectiveTeamId = dto.teamId;
    let effectiveSystemRole = dto.systemRole ?? SystemRole.USER;
    let effectiveManagerId = dto.managerId;

    if (actor.systemRole === SystemRole.MANAGER) {
      const managerTeamId = await this.getActorTeamId(actor.sub);
      if (dto.teamId !== managerTeamId) {
        throw new ForbiddenException('Gerentes só podem criar colaboradores no próprio time');
      }
      if (dto.systemRole && dto.systemRole !== SystemRole.USER) {
        throw new ForbiddenException('Gerentes só podem criar usuários com perfil de colaborador');
      }
      effectiveTeamId = managerTeamId;
      effectiveSystemRole = SystemRole.USER;
      effectiveManagerId = dto.managerId || actor.sub;
    }
    const hasCareerProgression = effectiveSystemRole === SystemRole.USER;
    const effectiveRoleId = hasCareerProgression ? dto.roleId : undefined;
    const effectiveStepId = hasCareerProgression ? dto.currentRoleStepId : undefined;
    const effectiveStepStartedAt = hasCareerProgression ? dto.currentRoleStepStartedAt : undefined;
    effectiveManagerId = hasCareerProgression ? effectiveManagerId : undefined;

    if (hasCareerProgression && !dto.hiredAt) {
      throw new BadRequestException('Informe a data de admissao do colaborador');
    }

    const email = dto.email.toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) throw new ConflictException('E-mail já cadastrado');

    let selectedStep: { id: string; roleId: string; salary: unknown } | null = null;
    if (effectiveStepId) {
      selectedStep = await this.prisma.roleStep.findUnique({
        where: { id: effectiveStepId },
        select: { id: true, roleId: true, salary: true },
      });
      if (!selectedStep) throw new NotFoundException('Step inicial não encontrado');
      if (!effectiveRoleId || selectedStep.roleId !== effectiveRoleId) throw new BadRequestException('O step inicial deve pertencer ao cargo selecionado');
    }

    if (effectiveRoleId) {
      const role = await this.prisma.role.findUnique({ where: { id: effectiveRoleId }, select: { id: true, teamId: true } });
      if (!role) throw new NotFoundException('Cargo não encontrado');
      if (role.teamId !== effectiveTeamId) throw new BadRequestException('O cargo deve pertencer ao time selecionado');
    }

    if (effectiveManagerId) {
      const selectedManager = await this.prisma.user.findUnique({
        where: { id: effectiveManagerId },
        select: { id: true, teamId: true, systemRole: true, active: true },
      });
      if (!selectedManager?.active) throw new BadRequestException('Gestor selecionado não está disponível');
      if (selectedManager.teamId !== effectiveTeamId) {
        throw new BadRequestException('O gestor deve pertencer ao mesmo time do colaborador');
      }
      if (selectedManager.systemRole !== SystemRole.MANAGER && selectedManager.systemRole !== SystemRole.ADMIN) {
        throw new BadRequestException('O gestor selecionado precisa ter perfil de gerente ou administrador');
      }
    }

    const passwordHash = await argon2.hash(dto.password);
    const startedAt = effectiveStepStartedAt
      ? new Date(effectiveStepStartedAt)
      : effectiveStepId && dto.hiredAt
        ? new Date(dto.hiredAt)
        : undefined;

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: dto.name,
          email,
          passwordHash,
          systemRole: effectiveSystemRole,
          hiredAt: dto.hiredAt ? new Date(dto.hiredAt) : null,
          professionalSince: dto.professionalSince ? new Date(dto.professionalSince) : undefined,
          teamId: effectiveTeamId,
          roleId: effectiveRoleId,
          currentRoleStepId: effectiveStepId,
          currentRoleStepStartedAt: startedAt,
          managerId: effectiveManagerId,
        },
        select: { id: true, name: true, email: true, systemRole: true, active: true, hiredAt: true },
      });

      if (effectiveRoleId && selectedStep && startedAt) {
        await tx.careerHistory.create({
          data: {
            userId: user.id,
            roleId: effectiveRoleId,
            roleStepId: selectedStep.id,
            salary: selectedStep.salary as any,
            startedAt,
            reason: 'Posição inicial cadastrada no PDI',
          },
        });
      }
      return user;
    });
  }

  async update(
    userId: string,
    dto: UpdateUserDto,
    actor: { sub: string; systemRole: SystemRole },
  ) {
    await this.assertCanModifyUser(actor, userId);
    const current = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!current) throw new NotFoundException('Usuário não encontrado');

    const actorTeamId = actor.systemRole === SystemRole.MANAGER
      ? await this.getActorTeamId(actor.sub)
      : null;
    const teamId = actorTeamId ?? dto.teamId ?? current.teamId;
    if (actorTeamId && dto.teamId && dto.teamId !== actorTeamId) {
      throw new ForbiddenException('Gerentes só podem editar colaboradores do próprio time');
    }
    if (!(await this.prisma.team.findUnique({ where: { id: teamId }, select: { id: true } }))) {
      throw new NotFoundException('Time não encontrado');
    }

    const isEmployee = current.systemRole === SystemRole.USER;
    const roleId = isEmployee
      ? (dto.roleId !== undefined ? dto.roleId || null : current.roleId)
      : null;
    const currentRoleStepId = isEmployee
      ? (dto.currentRoleStepId !== undefined ? dto.currentRoleStepId || null : current.currentRoleStepId)
      : null;
    const managerId = isEmployee
      ? (dto.managerId !== undefined ? dto.managerId || null : current.managerId)
      : null;

    if (roleId) {
      const role = await this.prisma.role.findUnique({ where: { id: roleId }, select: { teamId: true } });
      if (!role) throw new NotFoundException('Cargo não encontrado');
      if (role.teamId !== teamId) throw new BadRequestException('O cargo deve pertencer ao time selecionado');
    }
    if (currentRoleStepId) {
      const step = await this.prisma.roleStep.findUnique({
        where: { id: currentRoleStepId },
        select: { roleId: true, salary: true, active: true },
      });
      if (!step?.active) throw new NotFoundException('Step não encontrado ou inativo');
      if (!roleId || step.roleId !== roleId) throw new BadRequestException('O step deve pertencer ao cargo selecionado');
    }
    if (managerId) {
      if (managerId === userId) throw new BadRequestException('O colaborador não pode ser o próprio gestor');
      const manager = await this.prisma.user.findUnique({
        where: { id: managerId },
        select: { teamId: true, active: true, systemRole: true },
      });
      if (!manager?.active || manager.teamId !== teamId || ![SystemRole.MANAGER, SystemRole.ADMIN].includes(manager.systemRole)) {
        throw new BadRequestException('Selecione um gestor ativo do mesmo time');
      }
    }

    const email = dto.email?.trim().toLowerCase() ?? current.email;
    const duplicate = await this.prisma.user.findFirst({ where: { email, NOT: { id: userId } }, select: { id: true } });
    if (duplicate) throw new ConflictException('E-mail já cadastrado');
    const hiredAt = dto.hiredAt !== undefined ? (dto.hiredAt ? new Date(dto.hiredAt) : null) : current.hiredAt;
    if (isEmployee && !hiredAt) throw new BadRequestException('Informe a data de admissão do colaborador');
    const professionalSince = dto.professionalSince !== undefined
      ? (dto.professionalSince ? new Date(dto.professionalSince) : null)
      : current.professionalSince;
    const stepStartedAt = currentRoleStepId
      ? dto.currentRoleStepStartedAt
        ? new Date(dto.currentRoleStepStartedAt)
        : current.currentRoleStepStartedAt ?? hiredAt
      : null;
    const careerChanged = roleId !== current.roleId || currentRoleStepId !== current.currentRoleStepId;

    return this.prisma.$transaction(async (tx) => {
      if (careerChanged) {
        await tx.careerHistory.updateMany({ where: { userId, endedAt: null }, data: { endedAt: new Date() } });
      }
      const updated = await tx.user.update({
        where: { id: userId },
        data: {
          name: dto.name?.trim(), email, hiredAt, professionalSince, teamId,
          roleId, currentRoleStepId, currentRoleStepStartedAt: stepStartedAt, managerId,
        },
        select: { id: true, name: true, email: true, active: true },
      });
      if (careerChanged && roleId && currentRoleStepId && stepStartedAt) {
        const step = await tx.roleStep.findUniqueOrThrow({ where: { id: currentRoleStepId }, select: { salary: true } });
        await tx.careerHistory.create({
          data: { userId, roleId, roleStepId: currentRoleStepId, salary: step.salary, startedAt: stepStartedAt, reason: 'Cadastro do colaborador atualizado' },
        });
      }
      return updated;
    });
  }

  async deactivate(userId: string, actor: { sub: string; systemRole: SystemRole }) {
    await this.assertCanModifyUser(actor, userId);
    await this.prisma.user.update({ where: { id: userId }, data: { active: false } });
    return { success: true };
  }

  async changeCareerStep(
    userId: string,
    dto: ChangeCareerStepDto,
    actor: { sub: string; systemRole: SystemRole },
  ) {
    await this.assertCanModifyUser(actor, userId);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { currentRoleStep: true, role: true },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    if (!user.roleId) throw new BadRequestException('Usuário não possui cargo configurado');

    const target = await this.prisma.roleStep.findUnique({
      where: { id: dto.targetRoleStepId },
    });
    if (!target || !target.active) throw new NotFoundException('Step de destino não encontrado ou inativo');
    if (target.roleId !== user.roleId) throw new BadRequestException('O step de destino deve pertencer ao cargo atual do colaborador');
    if (target.id === user.currentRoleStepId) throw new BadRequestException('O colaborador já está neste step');

    const effectiveAt = dto.effectiveAt ? new Date(dto.effectiveAt) : new Date();
    const reason = dto.reason.trim();
    if (!reason) throw new BadRequestException('Informe a justificativa da movimentação');
    if (!user.hiredAt || !Number.isFinite(effectiveAt.getTime()) || effectiveAt > new Date() || effectiveAt < user.hiredAt || (user.currentRoleStepStartedAt && effectiveAt < user.currentRoleStepStartedAt)) {
      throw new BadRequestException('Data de movimentação incompatível com o histórico');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Compare-and-set prevents two concurrent movements from using the same prior step.
      const claimed = await tx.user.updateMany({ where: { id: userId, currentRoleStepId: user.currentRoleStepId, currentRoleStepStartedAt: user.currentRoleStepStartedAt }, data: { currentRoleStepId: target.id, currentRoleStepStartedAt: effectiveAt } });
      if (claimed.count !== 1) throw new ConflictException('A carreira foi alterada simultaneamente; recarregue os dados');
      await tx.careerHistory.updateMany({
        where: { userId, endedAt: null },
        data: { endedAt: effectiveAt },
      });

      const updated = await tx.user.update({
        where: { id: userId },
        data: {
          currentRoleStepId: target.id,
          currentRoleStepStartedAt: effectiveAt,
        },
        select: {
          id: true,
          name: true,
          currentRoleStepStartedAt: true,
          currentRoleStep: { select: { id: true, code: true, label: true, salary: true, order: true } },
        },
      });

      await tx.careerHistory.create({
        data: {
          userId,
          roleId: user.roleId!,
          roleStepId: target.id,
          salary: target.salary,
          startedAt: effectiveAt,
          reason,
        },
      });

      return {
        ...updated,
        previousStep: user.currentRoleStep ? {
          id: user.currentRoleStep.id,
          code: user.currentRoleStep.code,
          label: user.currentRoleStep.label,
          order: user.currentRoleStep.order,
        } : null,
        skippedSteps: user.currentRoleStep ? Math.max(0, Math.abs(target.order - user.currentRoleStep.order) - 1) : 0,
        reason,
      };
    });

    await this.notifications.create({
      userId,
      type: NotificationType.CAREER_STEP_CHANGED,
      title: 'Sua etapa de carreira mudou',
      message: 'Você agora está em ' + target.label,
      href: '/meu-pdi',
      metadata: {
        targetRoleStepId: target.id,
        changedBy: actor.sub,
        reason,
      },
    });

    return result;
  }
  async changeOwnPassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true, active: true },
    });
    if (!user || !user.active) throw new NotFoundException('Usuário não encontrado');

    const valid = await argon2.verify(user.passwordHash, currentPassword);
    if (!valid) throw new BadRequestException('Senha atual incorreta');

    if (currentPassword === newPassword) {
      throw new BadRequestException('A nova senha deve ser diferente da senha atual');
    }

    const passwordHash = await argon2.hash(newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { success: true };
  }

  async assertCanAccessUser(
    actor: { sub: string; systemRole: SystemRole },
    targetUserId: string,
  ) {
    if (actor.systemRole === SystemRole.ADMIN) return;

    if (actor.systemRole !== SystemRole.MANAGER) {
      throw new ForbiddenException('Apenas administradores e gerentes podem acessar este recurso');
    }

    const [actorTeamId, target] = await Promise.all([
      this.getActorTeamId(actor.sub),
      this.prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, teamId: true },
      }),
    ]);

    if (!target) throw new NotFoundException('Usuário não encontrado');
    if (!actorTeamId || target.teamId !== actorTeamId) {
      throw new ForbiddenException('Gerentes só podem acessar colaboradores do próprio time');
    }
  }

  async assertCanModifyUser(actor: { sub: string; systemRole: SystemRole }, targetUserId: string) {
    await this.assertCanAccessUser(actor, targetUserId);
    if (actor.sub === targetUserId) throw new ForbiddenException('Não é permitido alterar a própria carreira ou qualificação');
    const target = await this.prisma.user.findUnique({ where: { id: targetUserId }, select: { active: true, systemRole: true } });
    if (!target?.active) throw new ForbiddenException('Colaborador indisponível');
    if (actor.systemRole === SystemRole.MANAGER && target.systemRole !== SystemRole.USER) {
      throw new ForbiddenException('Gerentes só podem alterar colaboradores');
    }
  }

  private async getActorTeamId(actorId: string) {
    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: { teamId: true, active: true },
    });
    if (!actor || !actor.active) throw new ForbiddenException('Usuário responsável não encontrado ou inativo');
    return actor.teamId;
  }
}
