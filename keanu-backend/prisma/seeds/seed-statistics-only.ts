import { PrismaClient } from '@prisma/client';
import { seedStatistics } from './statistics.seed';

const prisma = new PrismaClient();

async function main() {
  console.log('📊 Starting statistics data seeding...');

  try {
    // Get existing users
    const existingUsers = await prisma.user.findMany({
      where: {
        isDeleted: false,
      },
      take: 100, // Get first 100 users
    });

    if (existingUsers.length === 0) {
      console.log('⚠️  No existing users found. Please run full seed first: npm run db:seed');
      process.exit(1);
    }

    console.log(`📋 Found ${existingUsers.length} existing users`);

    // Seed statistics data
    await seedStatistics(prisma, existingUsers);

    console.log('✅ Statistics data seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during statistics seeding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

