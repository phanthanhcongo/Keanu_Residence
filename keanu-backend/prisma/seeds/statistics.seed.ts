import { PrismaClient, UserRole } from '@prisma/client';

/**
 * Seed statistics data for testing charts
 * NOTE: Activity logs are no longer seeded - only real user actions are logged
 */
export async function seedStatistics(prisma: PrismaClient, existingUsers: any[]) {
  console.log('📊 Seeding statistics data...');
  console.log('ℹ️  Activity logs are NOT seeded - only real user actions will be logged');
  console.log(`✅ Using ${existingUsers.length} existing users`);
  console.log('📈 Statistics seed completed (no fake activity logs created)');

  return {
    newUsers: [],
    activityLogs: [],
  };
}

