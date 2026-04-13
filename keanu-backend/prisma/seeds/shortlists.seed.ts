import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { randomUUID } from 'crypto';

type User = {
  id: string;
  phoneNumber: string | null; // phoneNumber giờ có thể null
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: any;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type Unit = {
  id: string;
  projectId: string;
  unitNumber: string;
  unitType: string;
  floor: number | null;
  size: any;
  bedrooms: number;
  bathrooms: any;
  price: any;
  status: any;
  description: string | null;
  floorPlanUrl: string | null;
  imageUrls: any;
  features: any;
  xPosition: number | null;
  yPosition: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function seedShortlists(prisma: PrismaClient, users: User[], units: Unit[]) {
  console.log('  - Creating shortlists...');
  
  // Filter only buyer users
  const buyers = users.filter(user => user.role === 'BUYER');
  
  // Only shortlist units from Nyala Villas (all units should be from same project now)
  const nyalaUnits = units; // All units are now from Nyala Villas
  
  if (nyalaUnits.length === 0) {
    console.log('  ⚠️  No units found, skipping shortlist seeding');
    return;
  }
  
  let shortlistCount = 0;
  
  // Create only 1-2 shortlists
  if (buyers.length > 0 && nyalaUnits.length > 0) {
    const shortlistCountTarget = faker.number.int({ min: 1, max: 2 });
    
    for (let i = 0; i < shortlistCountTarget && i < buyers.length && i < nyalaUnits.length; i++) {
      try {
        await prisma.shortlist.create({
          data: {
            id: randomUUID(),
            userId: buyers[i].id,
            unitId: nyalaUnits[i].id,
            createdAt: faker.date.between({ 
              from: new Date('2025-11-01'),
              to: new Date() 
            }),
          },
        });
        shortlistCount++;
      } catch (error) {
        // Skip if combination already exists (unique constraint)
        continue;
      }
    }
  }
  
  console.log(`  ✅ Created ${shortlistCount} shortlist entries`);
}