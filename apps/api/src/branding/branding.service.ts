import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UpdateVisualIdentityDto } from './dto/update-visual-identity.dto';

@Injectable()
export class BrandingService {
  constructor(private readonly prisma: PrismaService) {}

  getVisualIdentity() {
    return this.prisma.visualIdentity.upsert({
      where: { id: 'default' },
      create: { id: 'default' },
      update: {},
    });
  }

  updateVisualIdentity(dto: UpdateVisualIdentityDto) {
    return this.prisma.visualIdentity.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        appName: dto.appName?.trim() || 'Trilha',
        tagline: dto.tagline?.trim() || 'Evolução profissional com clareza.',
        logoLight: dto.logoLight ?? null,
        logoDark: dto.logoDark ?? null,
        iconLight: dto.iconLight ?? null,
        iconDark: dto.iconDark ?? null,
      },
      update: {
        appName: dto.appName?.trim(),
        tagline: dto.tagline?.trim(),
        logoLight: dto.logoLight,
        logoDark: dto.logoDark,
        iconLight: dto.iconLight,
        iconDark: dto.iconDark,
      },
    });
  }
}
