import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { StepCode, SystemRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { SetStepRequirementsDto } from './dto/set-step-requirements.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(actor: { sub: string; systemRole: SystemRole }, teamId?: string) {
    let scopedTeamId = teamId;

    if (actor.systemRole === SystemRole.MANAGER) {
      const manager = await this.prisma.user.findUnique({
        where: { id: actor.sub },
        select: { teamId: true, active: true },
      });
      if (!manager?.active) throw new NotFoundException('Gerente não encontrado ou inativo');
      scopedTeamId = manager.teamId;
    }

    return this.prisma.role.findMany({
      where: scopedTeamId ? { teamId: scopedTeamId } : undefined,
      include: {
        team: true,
        steps: {
          orderBy: { order: 'asc' },
          include: {
            requirements: {
              where: { required: true },
              include: {
                qualification: {
                  select: { id: true, name: true, type: true, description: true },
                },
              },
              orderBy: { qualification: { name: 'asc' } },
            },
          },
        },
        _count: { select: { users: true } },
      },
      orderBy: [{ team: { name: 'asc' } }, { name: 'asc' }],
    });
  }

  async create(dto: CreateRoleDto) {
    if (!dto.steps.some((s) => s.code === StepCode.BASE)) throw new BadRequestException('Todo cargo deve possuir o step BASE');
    if (dto.steps.filter((s) => s.code === StepCode.BASE).length !== 1) throw new BadRequestException('O cargo deve possuir exatamente um step BASE');

    const codes = new Set(dto.steps.map((s) => s.code));
    const orders = new Set(dto.steps.map((s) => s.order));
    if (codes.size !== dto.steps.length || orders.size !== dto.steps.length) throw new BadRequestException('Steps não podem repetir código ou ordem');

    if (!(await this.prisma.team.findUnique({ where: { id: dto.teamId } }))) throw new NotFoundException('Time não encontrado');
    if (await this.prisma.role.findUnique({ where: { teamId_name: { teamId: dto.teamId, name: dto.name.trim() } } })) throw new ConflictException('Cargo já cadastrado neste time');

    const requirementIds = dto.steps.flatMap((step) => step.requirements?.map((item) => item.qualificationId) ?? []);
    if (new Set(requirementIds).size !== requirementIds.length) {
      const duplicatedWithinStep = dto.steps.some((step) => {
        const ids = step.requirements?.map((item) => item.qualificationId) ?? [];
        return new Set(ids).size !== ids.length;
      });
      if (duplicatedWithinStep) throw new BadRequestException('Uma qualificação não pode se repetir dentro do mesmo step');
    }

    if (requirementIds.length) {
      const validQualifications = await this.prisma.qualification.findMany({
        where: { id: { in: [...new Set(requirementIds)] }, teamId: dto.teamId, active: true },
        select: { id: true },
      });
      if (validQualifications.length !== new Set(requirementIds).size) {
        throw new BadRequestException('Uma ou mais qualificações são inválidas, estão inativas ou pertencem a outro time');
      }
    }

    return this.prisma.role.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim(),
        teamId: dto.teamId,
        steps: {
          create: dto.steps.map((s) => ({
            code: s.code,
            label: s.label,
            order: s.order,
            salary: s.salary.toString(),
            minTenureMonths: s.minTenureMonths,
            minExperienceMonths: s.minExperienceMonths,
            minMonthsInCurrentStep: s.minMonthsInCurrentStep,
            requirements: s.requirements?.length ? {
              create: s.requirements.map((requirement) => ({
                qualificationId: requirement.qualificationId,
                required: true,
                notes: requirement.notes?.trim(),
              })),
            } : undefined,
          })),
        },
      },
      include: {
        steps: {
          orderBy: { order: 'asc' },
          include: {
            requirements: {
              include: { qualification: true },
              orderBy: { qualification: { name: 'asc' } },
            },
          },
        },
      },
    });
  }

  async update(id: string, dto: UpdateRoleDto) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { steps: true },
    });
    if (!role) throw new NotFoundException('Cargo não encontrado');

    const name = dto.name.trim();
    const duplicate = await this.prisma.role.findFirst({
      where: {
        teamId: role.teamId,
        name,
        NOT: { id },
      },
      select: { id: true },
    });
    if (duplicate) throw new ConflictException('Já existe outro cargo com este nome no time');

    const existingIds = new Set(role.steps.map((step) => step.id));
    const incomingIds = dto.steps.map((step) => step.id);
    if (new Set(incomingIds).size !== incomingIds.length) {
      throw new BadRequestException('Steps não podem se repetir');
    }
    if (incomingIds.some((stepId) => !existingIds.has(stepId))) {
      throw new BadRequestException('Um ou mais steps não pertencem a este cargo');
    }
    if (incomingIds.length !== role.steps.length) {
      throw new BadRequestException('A edição atual não permite adicionar ou remover steps; altere apenas os dados dos steps existentes');
    }

    const orders = dto.steps.map((step) => step.order);
    if (new Set(orders).size !== orders.length) {
      throw new BadRequestException('Steps não podem repetir ordem');
    }

    await this.prisma.$transaction([
      this.prisma.role.update({
        where: { id },
        data: {
          name,
          description: dto.description?.trim() || null,
        },
      }),
      ...dto.steps.map((step) =>
        this.prisma.roleStep.update({
          where: { id: step.id },
          data: {
            label: step.label.trim(),
            order: step.order,
            salary: step.salary.toString(),
            minTenureMonths: step.minTenureMonths,
            minExperienceMonths: step.minExperienceMonths,
            minMonthsInCurrentStep: step.minMonthsInCurrentStep,
          },
        }),
      ),
    ]);

    return this.prisma.role.findUnique({
      where: { id },
      include: {
        team: true,
        steps: {
          orderBy: { order: 'asc' },
          include: {
            requirements: {
              where: { required: true },
              include: { qualification: true },
              orderBy: { qualification: { name: 'asc' } },
            },
          },
        },
        _count: { select: { users: true } },
      },
    });
  }

  async setStepRequirements(stepId: string, dto: SetStepRequirementsDto) {
    const step = await this.prisma.roleStep.findUnique({
      where: { id: stepId },
      include: { role: { select: { teamId: true } } },
    });
    if (!step) throw new NotFoundException('Step não encontrado');

    const ids = dto.requirements.map((item) => item.qualificationId);
    if (new Set(ids).size !== ids.length) throw new BadRequestException('Qualificações não podem se repetir');

    const qualifications = await this.prisma.qualification.findMany({
      where: {
        id: { in: ids },
        active: true,
        teamId: step.role.teamId,
      },
      select: { id: true },
    });
    if (qualifications.length !== ids.length) throw new BadRequestException('Uma ou mais qualificações não existem, estão inativas ou pertencem a outro time');

    await this.prisma.$transaction([
      this.prisma.roleStepQualification.deleteMany({ where: { roleStepId: stepId } }),
      this.prisma.roleStepQualification.createMany({
        data: dto.requirements.map((item) => ({
          roleStepId: stepId,
          qualificationId: item.qualificationId,
          required: item.required ?? true,
          notes: item.notes?.trim(),
        })),
      }),
    ]);

    return this.prisma.roleStep.findUnique({
      where: { id: stepId },
      include: {
        requirements: {
          include: { qualification: true },
          orderBy: { qualification: { name: 'asc' } },
        },
      },
    });
  }

  async getStepRequirements(stepId: string) {
    const step = await this.prisma.roleStep.findUnique({
      where: { id: stepId },
      include: {
        requirements: {
          include: { qualification: true },
          orderBy: { qualification: { name: 'asc' } },
        },
      },
    });
    if (!step) throw new NotFoundException('Step não encontrado');
    return step;
  }
}
