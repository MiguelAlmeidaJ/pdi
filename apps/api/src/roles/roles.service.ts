import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { StepCode } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { SetStepRequirementsDto } from './dto/set-step-requirements.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(teamId?: string) {
    return this.prisma.role.findMany({
      where: teamId ? { teamId } : undefined,
      include: { team: true, steps: { orderBy: { order: 'asc' } }, _count: { select: { users: true } } },
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

    return this.prisma.role.create({
      data: {
        name: dto.name.trim(), description: dto.description?.trim(), teamId: dto.teamId,
        steps: { create: dto.steps.map((s) => ({ ...s, salary: s.salary.toString() })) },
      },
      include: { steps: { orderBy: { order: 'asc' } } },
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
