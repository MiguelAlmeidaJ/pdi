import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { createHmac } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly jwt: JwtService, private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  async canActivate(context: ExecutionContext) {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()])) return true;
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    if (!token) throw new UnauthorizedException('Token não informado');
    try {
      const payload = await this.jwt.verifyAsync(token);
      if (typeof payload.sub !== 'string') throw new UnauthorizedException();
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, email: true, active: true, systemRole: true, passwordHash: true } });
      if (!user?.active || user.systemRole !== payload.systemRole) throw new UnauthorizedException();
      const version = createHmac('sha256', this.config.getOrThrow<string>('JWT_SECRET')).update(user.passwordHash).digest('hex');
      if (payload.version !== version) throw new UnauthorizedException();
      request.user = { sub: user.id, email: user.email, systemRole: user.systemRole };
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }
}
