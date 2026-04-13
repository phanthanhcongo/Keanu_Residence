import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Syncing shortlist counts...');

  // 1. Get all units
  const units = await prisma.unit.findMany({
    select: { id: true, unitNumber: true }
  });

  console.log(`Found ${units.length} units.`);

  // 2. Get counts from Shortlist table
  const counts = await prisma.shortlist.groupBy({
    by: ['unitId'],
    where: { isDeleted: false },
    _count: { unitId: true }
  });

  const countMap = new Map(counts.map(c => [c.unitId, c._count.unitId]));

  // 3. Update units
  let updatedCount = 0;
  for (const unit of units) {
    const count = countMap.get(unit.id) || 0;
    
    await prisma.unit.update({
      where: { id: unit.id },
      data: { shortlistCount: count }
    });
    
    if (count > 0) {
      console.log(`  - Unit ${unit.unitNumber}: ${count} shortlists`);
    }
    updatedCount++;
  }

  console.log(`\n✅ Successfully synced shortlist counts for ${updatedCount} units.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
