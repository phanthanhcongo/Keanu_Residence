import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../modules/users/entities/user.entity';
import { ROLES_KEY } from '../guards/admin.guard';

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

