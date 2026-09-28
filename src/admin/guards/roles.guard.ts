import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type {
  AuthenticatedRequest,
  JwtPayload,
} from '../../auth/jwt-payload.interface.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<
      JwtPayload['role'][]
    >(ROLES_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!requiredRoles.includes(request.user?.role)) {
      throw new ForbiddenException(
        'You do not have permission to perform this action',
      );
    }

    return true;
  }
}
