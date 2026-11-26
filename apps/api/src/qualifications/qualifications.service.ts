import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CourseDelivery, CourseModality, QualificationType, SystemRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateQualificationDto } from './dto/create-qualification.dto';
import { UpdateQualificationDto } from './dto/update-qualification.dto';

@Injectable()
export class QualificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(actor: { sub: string; systemRole: SystemRole }, teamId?: string) {
    let scopedTeamId = teamId;

    if (actor.systemRole === SystemRole.MANAGER) {
      const manager = await this.prisma.user.findUnique({
        where: { id: actor.sub },
        select: { teamId: true, active: true },
      });
      if (!manager?.active) throw new ForbiddenException('Gerente não encontrado ou inativo');
      scopedTeamId = manager.teamId;
    }

    return this.prisma.qualification.findMany({
      where: scopedTeamId ? {
        OR: [
          { teamId: scopedTeamId },
          { teamId: null, type: QualificationType.TENURE },
        ],
      } : undefined,
      include: {
        team: { select: { id: true, name: true } },
        links: { orderBy: { order: 'asc' } },
        _count: { select: { roleStepRequirements: true, userQualifications: true } },
      },
      orderBy: [{ team: { name: 'asc' } }, { type: 'asc' }, { name: 'asc' }],
    });
  }

  async create(dto: CreateQualificationDto, actor: { sub: string; systemRole: SystemRole }) {
    const name = dto.name.trim();
    let effectiveTeamId = dto.teamId || null;

    if (actor.systemRole === SystemRole.MANAGER) {
      const manager = await this.prisma.user.findUnique({
        where: { id: actor.sub },
        select: { teamId: true, active: true },
      });
      if (!manager?.active) throw new ForbiddenException('Gerente não encontrado ou inativo');
      if (dto.teamId && dto.teamId !== manager.teamId) {
        throw new ForbiddenException('Gerentes só podem criar qualificações no próprio time');
      }
      effectiveTeamId = manager.teamId;
    }

    if (!effectiveTeamId && dto.type !== QualificationType.TENURE) {
      throw new BadRequestException('Selecione o time da qualificação');
    }
    if (!effectiveTeamId && actor.systemRole !== SystemRole.ADMIN) {
      throw new ForbiddenException('Somente administradores podem criar requisitos para todos os times');
    }
    if (effectiveTeamId) {
      const team = await this.prisma.team.findUnique({ where: { id: effectiveTeamId } });
      if (!team) throw new NotFoundException('Time não encontrado');
    }
    this.assertAutomaticRequirement(dto.type, dto.requiredMonths);
    const courseModality = dto.type === QualificationType.COURSE
      ? dto.courseModality ?? CourseModality.ONLINE
      : null;
    const courseDelivery = dto.type === QualificationType.COURSE && courseModality === CourseModality.ONLINE
      ? dto.courseDelivery ?? CourseDelivery.PLATFORM
      : null;
    this.assertCourseConfiguration(dto.type, courseModality, courseDelivery, dto.links);

    const exists = await this.prisma.qualification.findFirst({
      where: { teamId: effectiveTeamId, name, type: dto.type },
    });
    if (exists) throw new ConflictException(effectiveTeamId
      ? 'Qualificação já cadastrada neste time'
      : 'Qualificação global já cadastrada');

    const automatic = dto.type === QualificationType.TENURE;
    return this.prisma.qualification.create({
      data: {
        teamId: effectiveTeamId,
        name,
        type: dto.type,
        description: dto.description?.trim(),
        requiredMonths: automatic ? dto.requiredMonths : null,
        courseModality,
        courseDelivery,
        courseInstructions: courseModality === CourseModality.IN_PERSON ? dto.courseInstructions?.trim() : null,
        links: !automatic && dto.links?.length ? {
          create: dto.links.map((link, index) => ({
            title: link.title.trim(),
            url: link.url,
            order: index,
          })),
        } : undefined,
      },
      include: {
        team: { select: { id: true, name: true } },
        links: { orderBy: { order: 'asc' } },
      },
    });
  }

  async update(
    id: string,
    dto: UpdateQualificationDto,
    actor: { sub: string; systemRole: SystemRole },
  ) {
    const current = await this.prisma.qualification.findUnique({
      where: { id },
      include: {
        course: { select: { id: true } },
        links: { orderBy: { order: 'asc' } },
      },
    });
    if (!current) throw new NotFoundException('Qualificação não encontrada');

    if (actor.systemRole === SystemRole.MANAGER) {
      const manager = await this.prisma.user.findUnique({
        where: { id: actor.sub },
        select: { teamId: true, active: true },
      });
      if (!manager?.active) throw new ForbiddenException('Gerente não encontrado ou inativo');
      if (current.teamId !== manager.teamId) {
        throw new ForbiddenException('Gerentes só podem editar qualificações do próprio time');
      }
    }

    const name = dto.name?.trim() ?? current.name;
    const type = dto.type ?? current.type;
    const requiredMonths = dto.requiredMonths ?? current.requiredMonths ?? undefined;
    this.assertAutomaticRequirement(type, requiredMonths);
    const courseModality = type === QualificationType.COURSE
      ? dto.courseModality ?? current.courseModality ?? CourseModality.ONLINE
      : null;
    const courseDelivery = type === QualificationType.COURSE && courseModality === CourseModality.ONLINE
      ? dto.courseDelivery ?? current.courseDelivery ?? CourseDelivery.PLATFORM
      : null;
    this.assertCourseConfiguration(type, courseModality, courseDelivery, dto.links ?? current.links);
    if (current.course && (courseModality !== CourseModality.ONLINE || courseDelivery !== CourseDelivery.PLATFORM)) {
      throw new BadRequestException('Este curso já possui aulas na Trilha e deve continuar como Online · Na Trilha');
    }

    const duplicate = await this.prisma.qualification.findFirst({
      where: { teamId: current.teamId, name, type, NOT: { id } },
    });
    if (duplicate) throw new ConflictException('Qualificação já cadastrada neste time');

    const automatic = type === QualificationType.TENURE;
    return this.prisma.$transaction(async (tx) => {
      await tx.qualification.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          type: dto.type,
          description: dto.description?.trim(),
          active: dto.active,
          requiredMonths: automatic ? requiredMonths : null,
          courseModality,
          courseDelivery,
          courseInstructions: courseModality === CourseModality.IN_PERSON
            ? (dto.courseInstructions ?? current.courseInstructions)?.trim() || null
            : null,
        },
      });

      if (automatic) {
        await tx.qualificationLink.deleteMany({ where: { qualificationId: id } });
      } else if (dto.links) {
        await tx.qualificationLink.deleteMany({ where: { qualificationId: id } });
        if (dto.links.length) {
          await tx.qualificationLink.createMany({
            data: dto.links.map((link, index) => ({
              qualificationId: id,
              title: link.title.trim(),
              url: link.url,
              order: index,
            })),
          });
        }
      }

      return tx.qualification.findUnique({
        where: { id },
        include: {
          team: { select: { id: true, name: true } },
          links: { orderBy: { order: 'asc' } },
          _count: { select: { roleStepRequirements: true, userQualifications: true } },
        },
      });
    });
  }

  private assertAutomaticRequirement(type: QualificationType, requiredMonths?: number) {
    if (type === QualificationType.TENURE && !requiredMonths) {
      throw new BadRequestException('Informe o tempo mínimo de casa em meses');
    }
  }

  private assertCourseConfiguration(
    type: QualificationType,
    modality: CourseModality | null,
    delivery: CourseDelivery | null,
    links?: Array<{ title: string; url: string }>,
  ) {
    if (type !== QualificationType.COURSE) return;
    if (!modality) throw new BadRequestException('Informe se o curso será online ou presencial');
    if (modality === CourseModality.ONLINE && !delivery) {
      throw new BadRequestException('Informe onde as aulas online serão realizadas');
    }
    if (delivery === CourseDelivery.EXTERNAL && !links?.some((link) => link.title.trim() && link.url.trim())) {
      throw new BadRequestException('Cadastre ao menos um link da qualificação para acessar a plataforma externa');
    }
  }
}
