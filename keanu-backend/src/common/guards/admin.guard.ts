import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../modules/users/entities/user.entity';

export const ROLES_KEY = 'roles';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    let requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      // If no roles specified, allow ADMIN and SUPER_ADMIN
      requiredRoles = [UserRole.ADMIN, UserRole.SUPER_ADMIN];
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const hasRole = requiredRoles.some((role) => user.role === role);
    
    if (!hasRole) {
      throw new ForbiddenException('Insufficient permissions. Admin access required.');
    }

    return true;
  }
}

