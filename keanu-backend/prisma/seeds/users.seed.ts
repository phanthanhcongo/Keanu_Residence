import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';

type User = {
  id: string;
  phoneNumber: string | null; // phoneNumber giờ có thể null
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export async function seedUsers(prisma: PrismaClient): Promise<User[]> {
  console.log('  - Creating admin users...');

  // Lưu ý: Seed data LUÔN PHẢI có phoneNumber (không được null)
  // Chỉ có register mới cho phép phoneNumber = null

  // Create Super Admin
  const superAdminPassword = await bcrypt.hash('admin123', 10);
  const superAdmin = await prisma.user.create({
    data: {
      id: randomUUID(),
      phoneNumber: '+84901234567', // Bắt buộc phải có phoneNumber trong seed
      email: 'superadmin@keanu.com',
      firstName: 'Super',
      lastName: 'Admin',
      password: superAdminPassword,
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      isVerified: true,
    },
  });

  // Create 1 Admin user
  const admin = await prisma.user.create({
    data: {
      id: randomUUID(),
      phoneNumber: '+84901234561',
      email: 'admin1@keanu.com',
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      isVerified: true,
    },
  });

  console.log('  - Creating buyer users...');

  // Create test user with password
  const testPassword = await bcrypt.hash('123123', 10);
  const testUser = await prisma.user.create({
    data: {
      id: randomUUID(),
      phoneNumber: '+84900000002',
      email: 'user123@example.com',
      firstName: 'Test',
      lastName: 'User',
      password: testPassword,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      isVerified: true,
    },
  });

  // Create 1 Buyer user
  const buyer = await prisma.user.create({
    data: {
      id: randomUUID(),
      phoneNumber: '+84900000001',
      email: 'buyer1@nyalavillas.com',
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      role: UserRole.BUYER,
      status: UserStatus.ACTIVE,
      isVerified: true,
      dateOfBirth: faker.date.birthdate({ min: 25, max: 65, mode: 'age' }),
      gender: faker.helpers.arrayElement(['Male', 'Female', 'Other']),
      address: faker.location.streetAddress(),
      city: faker.location.city(),
      country: faker.helpers.arrayElement(['Indonesia', 'Singapore', 'Malaysia', 'Australia', 'United States']),
    },
  });

  // Create Sales user
  const salesPassword = await bcrypt.hash('123123', 10);
  const sales = await prisma.user.create({
    data: {
      id: randomUUID(),
      phoneNumber: '+84900000003',
      email: 'sales123@example.com',
      firstName: 'Sales',
      lastName: 'User',
      password: salesPassword,
      role: UserRole.SALES,
      status: UserStatus.ACTIVE,
      isVerified: true,
    },
  });

  const allUsers = [superAdmin, admin, testUser, buyer, sales];
  console.log(`  ✅ Created ${allUsers.length} users (1 super admin, 1 admin, 1 test user, 1 buyer, 1 sales)`);
  console.log(`  📧 Super Admin: superadmin@keanu.com / password: admin123`);
  console.log(`  📧 Test user: user123@example.com / password: 123123`);
  console.log(`  📧 Sales user: sales123@example.com / password: 123123`);

  return allUsers;
}