import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      // For public routes, still attempt to validate JWT if present
      // This allows us to identify logged-in users on public endpoints
      // The handleRequest method will handle the case when no token is present
      return super.canActivate(context);
    }

    // For protected routes, require authentication
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // For public routes, allow access even without authentication
    if (isPublic) {
      return user || undefined;
    }

    // For protected routes, throw error if authentication fails
    if (err || !user) {
      throw err || new UnauthorizedException('Authentication required');
    }

    return user;
  }
}

