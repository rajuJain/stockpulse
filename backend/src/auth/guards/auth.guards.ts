import { Injectable, ExecutionContext, CanActivate, ForbiddenException, SetMetadata } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../users/user.entity';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

// ── Roles ──────────────────────────────────────────────────────────────────
export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (!required?.length) return true;
    const { user } = ctx.switchToHttp().getRequest();
    if (!user || !required.includes(user.role)) {
      throw new ForbiddenException('Insufficient role');
    }
    return true;
  }
}

// ── SEBI required ──────────────────────────────────────────────────────────
export const SEBI_REQUIRED_KEY = 'sebiRequired';
export const SebiVerified = () => SetMetadata(SEBI_REQUIRED_KEY, true);

@Injectable()
export class SebiVerifiedGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<boolean>(SEBI_REQUIRED_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (!required) return true;
    const { user } = ctx.switchToHttp().getRequest();
    if (!user?.sebi || !user?.sebiVerified) {
      throw new ForbiddenException('SEBI verification required for this action');
    }
    return true;
  }
}
