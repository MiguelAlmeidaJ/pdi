import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ChangeCareerStepDto } from './dto/change-career-step.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({
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
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
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
      },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  async create(dto: CreateUserDto) {
    const email = dto.email.toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) throw new ConflictException('E-mail já cadastrado');

    let selectedStep: { id: string; roleId: string; salary: unknown } | null = null;
    if (dto.currentRoleStepId) {
      selectedStep = await this.prisma.roleStep.findUnique({
        where: { id: dto.currentRoleStepId },
        select: { id: true, roleId: true, salary: true },
      });
      if (!selectedStep) throw new NotFoundException('Step inicial não encontrado');
      if (!dto.roleId || selectedStep.roleId !== dto.roleId) throw new BadRequestException('O step inicial deve pertencer ao cargo selecionado');
    }

    if (dto.roleId) {
      const role = await this.prisma.role.findUnique({ where: { id: dto.roleId }, select: { id: true, teamId: true } });
      if (!role) throw new NotFoundException('Cargo não encontrado');
      if (role.teamId !== dto.teamId) throw new BadRequestException('O cargo deve pertencer ao time selecionado');
    }

    const passwordHash = await argon2.hash(dto.password);
    const startedAt = dto.currentRoleStepStartedAt
      ? new Date(dto.currentRoleStepStartedAt)
      : dto.currentRoleStepId
        ? new Date(dto.hiredAt)
        : undefined;

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: dto.name,
          email,
          passwordHash,
          systemRole: dto.systemRole,
          hiredAt: new Date(dto.hiredAt),
          professionalSince: dto.professionalSince ? new Date(dto.professionalSince) : undefined,
          teamId: dto.teamId,
          roleId: dto.roleId,
          currentRoleStepId: dto.currentRoleStepId,
          currentRoleStepStartedAt: startedAt,
          managerId: dto.managerId,
        },
        select: { id: true, name: true, email: true, systemRole: true, active: true, hiredAt: true },
      });

      if (dto.roleId && selectedStep && startedAt) {
        await tx.careerHistory.create({
          data: {
            userId: user.id,
            roleId: dto.roleId,
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

  async changeCareerStep(userId: string, dto: ChangeCareerStepDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { currentRoleStep: true, role: true },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    if (!user.roleId) throw new BadRequestException('Usuário não possui cargo configurado');

    const target = await this.prisma.roleStep.findUnique({
      where: { id: dto.targetRoleStepId },
    });
    if (!target) throw new NotFoundException('Step de destino não encontrado');
    if (target.roleId !== user.roleId) throw new BadRequestException('O step de destino deve pertencer ao cargo atual do colaborador');
    if (target.id === user.currentRoleStepId) throw new BadRequestException('O colaborador já está neste step');

    const effectiveAt = dto.effectiveAt ? new Date(dto.effectiveAt) : new Date();
    const reason = dto.reason.trim();

    return this.prisma.$transaction(async (tx) => {
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
  }
}
