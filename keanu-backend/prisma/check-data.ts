import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkData() {
  console.log('📊 Database Summary Report');
  console.log('==========================\n');

  try {
    // Count all records
    const userCount = await prisma.user.count();
    const projectCount = await prisma.project.count();
    const unitCount = await prisma.unit.count();
    const shortlistCount = await prisma.shortlist.count();
    const reservationCount = await prisma.reservation.count();
    const manipulationCount = await prisma.userManipulation.count();

    console.log('📈 Record Counts:');
    console.log(`   Users: ${userCount}`);
    console.log(`   Projects: ${projectCount}`);
    console.log(`   Units: ${unitCount}`);
    console.log(`   Shortlists: ${shortlistCount}`);
    console.log(`   Reservations: ${reservationCount}`);
    console.log(`   User Manipulation: ${manipulationCount}\n`);

    // User breakdown
    const usersByRole = await prisma.user.groupBy({
      by: ['role'],
      _count: { role: true }
    });
    
    console.log('👥 Users by Role:');
    usersByRole.forEach(group => {
      console.log(`   ${group.role}: ${group._count.role}`);
    });
    console.log();

    // Project breakdown
    const projects = await prisma.project.findMany({
      select: {
        name: true,
        status: true,
        developer: true,
        location: true,
        _count: {
          select: {
            units: true,
            reservations: true
          }
        }
      }
    });

    console.log('🏗️ Projects Overview:');
    projects.forEach(project => {
      console.log(`   📍 ${project.name} (${project.status})`);
      console.log(`      Developer: ${project.developer}`);
      console.log(`      Location: ${project.location}`);
      console.log(`      Units: ${project._count.units}`);
      console.log(`      Reservations: ${project._count.reservations}`);
      console.log();
    });

    // Unit status breakdown
    const unitsByStatus = await prisma.unit.groupBy({
      by: ['status'],
      _count: { status: true }
    });

    console.log('🏠 Units by Status:');
    unitsByStatus.forEach(group => {
      console.log(`   ${group.status}: ${group._count.status}`);
    });
    console.log();

    // Unit type breakdown
    const unitsByType = await prisma.unit.groupBy({
      by: ['unitType'],
      _count: { unitType: true }
    });

    console.log('🏠 Units by Type:');
    unitsByType.forEach(group => {
      console.log(`   ${group.unitType}: ${group._count.unitType}`);
    });
    console.log();

    // Reservation status breakdown
    const reservationsByStatus = await prisma.reservation.groupBy({
      by: ['status'],
      _count: { status: true }
    });

    console.log('📝 Reservations by Status:');
    reservationsByStatus.forEach(group => {
      console.log(`   ${group.status}: ${group._count.status}`);
    });
    console.log();

    // Payment status breakdown
    const reservationsByPaymentStatus = await prisma.reservation.groupBy({
      by: ['paymentStatus'],
      _count: { paymentStatus: true }
    });

    console.log('💳 Reservations by Payment Status:');
    reservationsByPaymentStatus.forEach(group => {
      console.log(`   ${group.paymentStatus}: ${group._count.paymentStatus}`);
    });
    console.log();

    // Sample data
    console.log('📋 Sample Data:');
    
    const sampleUser = await prisma.user.findFirst({
      where: { role: 'BUYER' }
    });
    console.log(`   Sample Buyer: ${sampleUser?.firstName} ${sampleUser?.lastName} (${sampleUser?.phoneNumber})`);

    const sampleUnit = await prisma.unit.findFirst({
      include: { project: { select: { name: true } } }
    });
    console.log(`   Sample Unit: ${sampleUnit?.unitNumber} (${sampleUnit?.unitType}) in ${sampleUnit?.project.name}`);
    console.log(`                Price: ${Number(sampleUnit?.price).toLocaleString()} VND`);

    const latestManipulation = await prisma.userManipulation.findFirst({
      orderBy: { milestone: 'desc' },
    });
    if (latestManipulation) {
      console.log(
        `   Latest Manipulation: delta=${latestManipulation.delta} @ ${latestManipulation.milestone.toISOString()}`
      );
    }

    const sampleReservation = await prisma.reservation.findFirst({
      include: {
        user: { select: { firstName: true, lastName: true } },
        unit: { select: { unitNumber: true, unitType: true } },
        project: { select: { name: true } }
      }
    });
    
    if (sampleReservation) {
      console.log(`   Sample Reservation: ${sampleReservation.user.firstName} ${sampleReservation.user.lastName}`);
      console.log(`                      reserved ${sampleReservation.unit.unitNumber} (${sampleReservation.unit.unitType})`);
      console.log(`                      in ${sampleReservation.project.name}`);
      console.log(`                      Status: ${sampleReservation.status}`);
    }

    console.log('\n✅ Database check completed successfully!');
    
  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();