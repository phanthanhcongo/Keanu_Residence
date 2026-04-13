import { PrismaClient, ReservationStatus, PaymentStatus } from '@prisma/client';
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

type Project = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  developer: string;
  location: string | null;
  launchDate: Date;
  launchTime: string;
  timezone: string;
  status: any;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  heroImageUrl: string | null;
  videoUrl: string | null;
  termsUrl: string | null;
  policyUrl: string | null;
  reservationDuration: number;
  depositAmount: any;
  createdAt: Date;
  updatedAt: Date;
};

export async function seedReservations(
  prisma: PrismaClient, 
  users: User[], 
  units: Unit[], 
  projects: Project[]
) {
  console.log('  - Creating reservations...');
  
  const buyers = users.filter(user => user.role === 'BUYER');
  
  // Only create reservations for Nyala Villas project
  const nyalaProject = projects.find(p => p.slug === 'nyala-villas');
  if (!nyalaProject) {
    console.log('  ⚠️  Nyala Villas project not found, skipping reservation seeding');
    return;
  }
  
  // Only use units from Nyala Villas
  const nyalaUnits = units.filter(unit => unit.projectId === nyalaProject.id);
  
  if (nyalaUnits.length === 0) {
    console.log('  ⚠️  No units found for Nyala Villas, skipping reservation seeding');
    return;
  }
  
  let reservationCount = 0;
  
  // Create a mix of reservation statuses for testing
  // Since all units are AVAILABLE, we'll create historical reservations
  
  // 1. Create some CONFIRMED reservations (successful purchases)
  const confirmedCount = Math.min(2, nyalaUnits.length); // 2 confirmed reservations
  const confirmedUnits = faker.helpers.arrayElements(nyalaUnits, confirmedCount);
  
  for (const unit of confirmedUnits) {
    const buyer = faker.helpers.arrayElement(buyers);
    const lockedAt = faker.date.between({ 
      from: new Date('2025-11-15'), 
      to: new Date('2025-11-25') 
    });
    const expiresAt = new Date(lockedAt);
    expiresAt.setMinutes(expiresAt.getMinutes() + nyalaProject.reservationDuration);
    const confirmedAt = new Date(lockedAt.getTime() + faker.number.int({ min: 2, max: 8 }) * 60 * 1000);
    
    try {
      await prisma.reservation.create({
        data: {
          id: randomUUID(),
          userId: buyer.id,
          unitId: unit.id,
          projectId: nyalaProject.id,
          status: ReservationStatus.CONFIRMED,
          lockedAt,
          expiresAt,
          confirmedAt,
          depositAmount: Number(nyalaProject.depositAmount),
          paymentIntentId: `pi_stripe_${faker.string.alphanumeric(24)}`,
          paymentStatus: PaymentStatus.SUCCEEDED,
          paymentMethod: faker.helpers.arrayElement(['stripe', 'paystack']),
          buyerName: `${buyer.firstName || 'John'} ${buyer.lastName || 'Doe'}`,
          buyerEmail: buyer.email || faker.internet.email(),
          buyerPhone: buyer.phoneNumber || null,
          source: faker.helpers.arrayElement(['google', 'facebook', 'website', 'referral']),
          campaign: faker.helpers.arrayElement(['nyala_launch', 'early_bird', 'vip_preview']),
        },
      });
      reservationCount++;
    } catch (error) {
      console.log(`    Warning: Could not create confirmed reservation for unit ${unit.unitNumber}: ${error}`);
    }
  }
  
  // 2. Create some PENDING reservations (currently in progress)
  const pendingCount = Math.min(1, nyalaUnits.length - confirmedCount);
  const availableForPending = nyalaUnits.filter(u => !confirmedUnits.includes(u));
  const pendingUnits = faker.helpers.arrayElements(availableForPending, pendingCount);
  
  for (const unit of pendingUnits) {
    const buyer = faker.helpers.arrayElement(buyers);
    const lockedAt = faker.date.between({ 
      from: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      to: new Date() 
    });
    const expiresAt = new Date(lockedAt);
    expiresAt.setMinutes(expiresAt.getMinutes() + nyalaProject.reservationDuration);
    
    try {
      await prisma.reservation.create({
        data: {
          id: randomUUID(),
          userId: buyer.id,
          unitId: unit.id,
          projectId: nyalaProject.id,
          status: ReservationStatus.PENDING,
          lockedAt,
          expiresAt,
          confirmedAt: null,
          depositAmount: Number(nyalaProject.depositAmount),
          paymentIntentId: `pi_${faker.helpers.arrayElement(['stripe', 'paystack'])}_${faker.string.alphanumeric(24)}`,
          paymentStatus: PaymentStatus.PENDING,
          paymentMethod: faker.helpers.arrayElement(['stripe', 'paystack']),
          buyerName: `${buyer.firstName || 'John'} ${buyer.lastName || 'Doe'}`,
          buyerEmail: buyer.email || faker.internet.email(),
          buyerPhone: buyer.phoneNumber || null,
          source: faker.helpers.arrayElement(['google', 'facebook', 'website']),
          campaign: 'nyala_launch',
        },
      });
      reservationCount++;
    } catch (error) {
      console.log(`    Warning: Could not create pending reservation for unit ${unit.unitNumber}: ${error}`);
    }
  }
  
  // 3. Create some EXPIRED/CANCELLED reservations (historical)
  const historicalCount = Math.min(5, nyalaUnits.length);
  const availableForHistorical = nyalaUnits.filter(u => 
    !confirmedUnits.includes(u) && !pendingUnits.includes(u)
  );
  const historicalUnits = faker.helpers.arrayElements(availableForHistorical, historicalCount);
  
  for (const unit of historicalUnits) {
    const buyer = faker.helpers.arrayElement(buyers);
    const lockedAt = faker.date.between({ 
      from: new Date('2025-11-01'), 
      to: new Date('2025-11-20') 
    });
    const expiresAt = new Date(lockedAt);
    expiresAt.setMinutes(expiresAt.getMinutes() + nyalaProject.reservationDuration);
    
    const reservationStatus = faker.helpers.arrayElement([
      ReservationStatus.EXPIRED,
      ReservationStatus.CANCELLED,
    ]);
    
    try {
      await prisma.reservation.create({
        data: {
          id: randomUUID(),
          userId: buyer.id,
          unitId: unit.id,
          projectId: nyalaProject.id,
          status: reservationStatus,
          lockedAt,
          expiresAt,
          confirmedAt: null,
          depositAmount: Number(nyalaProject.depositAmount),
          paymentIntentId: `pi_${faker.string.alphanumeric(24)}`,
          paymentStatus: PaymentStatus.FAILED,
          paymentMethod: faker.helpers.arrayElement(['stripe', 'paystack']),
          buyerName: `${buyer.firstName || 'John'} ${buyer.lastName || 'Doe'}`,
          buyerEmail: buyer.email || faker.internet.email(),
          buyerPhone: buyer.phoneNumber || null,
          source: faker.helpers.arrayElement(['google', 'facebook', 'website', 'referral']),
          campaign: faker.helpers.arrayElement(['nyala_launch', 'early_bird']),
        },
      });
      reservationCount++;
    } catch (error) {
      // Skip if there's a conflict
      continue;
    }
  }
  
  console.log(`  ✅ Created ${reservationCount} reservations for Nyala Villas`);
}