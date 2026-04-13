import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearActivityLogs() {
  try {
    console.log('🗑️  Starting to delete all activity logs...');
    
    // Count before deletion
    const countBefore = await prisma.activityLog.count();
    console.log(`📊 Found ${countBefore} activity logs`);

    // Delete all activity logs
    const result = await prisma.activityLog.deleteMany({});
    
    console.log(`✅ Successfully deleted ${result.count} activity logs`);
    console.log('✨ Activity logs cleared!');
  } catch (error) {
    console.error('❌ Error clearing activity logs:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

clearActivityLogs();

