import { Expose } from 'class-transformer';

export enum UserRole {
  BUYER = 'BUYER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
  SALES = 'SALES'
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

@Expose()
export class UserEntity {
  id: string;
  phoneNumber: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: Date;
  gender?: string;
  address?: string;
  city?: string;
  country?: string;
  avatarUrl?: string;
  password?: string;
  role: UserRole;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}