import { PrismaClient } from '@prisma/client';

export async function seedUserManipulation(prisma: PrismaClient = new PrismaClient()) {
  console.log('🌱 Seeding user_manipulation table...');

  // Launch datetime: 2026-01-15 18:00:00 in UTC+08:00
  const launchDate = new Date('2026-01-15T18:00:00+08:00');

  // Start 10 minutes before launch
  const startTime = new Date(launchDate.getTime() - 10 * 60 * 1000);

  const records: { delta: number; milestone: Date }[] = [];
  const totalRecords = 300; // 10 minutes * 60 seconds / 2-second interval

  for (let i = 0; i < totalRecords; i++) {
    // Calculate milestone: every 2 seconds
    const milestone = new Date(startTime.getTime() + i * 2000);

    // Increasing trend
    // Start: 20-35, Middle: 30-50, End: 45-60
    const progress = i / totalRecords; // 0 → 1
    const baseMin = 20 + Math.floor(progress * 25); // 20 → 45
    const baseMax = 30 + Math.floor(progress * 30); // 30 → 60

    const delta =
      Math.floor(Math.random() * (baseMax - baseMin + 1)) + baseMin;

    records.push({
      delta,
      milestone,
    });
  }

  // Clear existing data
  await prisma.userManipulation.deleteMany({});

  // Insert new records
  await prisma.userManipulation.createMany({ data: records });

  console.log(`✅ Created ${records.length} user manipulation records`);
  console.log(
    `📅 Range: ${records[0].milestone.toISOString()} to ${
      records[records.length - 1].milestone.toISOString()
    }`,
  );
  console.log(
    `📊 Delta range: ${Math.min(...records.map((r) => r.delta))} to ${Math.max(
      ...records.map((r) => r.delta),
    )}`,
  );
}

// Allow standalone execution
if (require.main === module) {
  const prisma = new PrismaClient();
  seedUserManipulation(prisma)
    .catch((e) => {
      console.error('❌ Error seeding user_manipulation:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
