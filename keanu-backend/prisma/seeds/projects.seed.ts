import { PrismaClient, ProjectStatus } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { randomUUID } from 'crypto';

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
  status: ProjectStatus;
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

export async function seedProjects(prisma: PrismaClient): Promise<Project[]> {
  console.log('  - Creating projects...');

  const projects: Project[] = [];

  // Keanu Residences - Single project
  // Launch: 3rd March 2026, 6PM Bali Time (WITA = UTC+8)
  // Converted to UTC: 3rd March 2026, 10AM UTC
  const keanuProject = await prisma.project.create({
    data: {
      id: randomUUID(),
      name: 'Keanu Residences',
      slug: 'keanu-residences',
      description: 'A collection of ten beachfront residences within a gated, low density estate plan. Designed for privacy, openness, and a sense of lasting value.',
      developer: 'Keanu Developments',
      location: 'Keramas, Bali — Sunrise Coast Living',
      launchDate: new Date('2026-03-28T10:00:00Z'), // 28th Mar 2026, 6PM Bali Time (10AM UTC)
      launchTime: '18:41',
      timezone: 'Asia/Makassar', // Bali timezone (WITA = UTC+8)
      status: ProjectStatus.UPCOMING,
      logoUrl: null,
      primaryColor: '#B99A7A', // Keanu brown
      secondaryColor: '#F5F2EB', // Keanu cream, stripped alpha to fit VarChar(7)
      heroImageUrl: null,
      videoUrl: null,
      termsUrl: null,
      policyUrl: null,
      reservationDuration: 10, // 10 minutes
      depositAmount: 1000.00, // $1,000 USD deposit
      isPrimary: true,
    },
  });
  projects.push(keanuProject);

  console.log(`  ✅ Created ${projects.length} project`);
  return projects;
}