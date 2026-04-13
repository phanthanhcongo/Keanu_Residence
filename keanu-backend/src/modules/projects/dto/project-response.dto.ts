import { ApiProperty } from '@nestjs/swagger';
import { ProjectStatus } from '../entities/project.entity';

export class CountdownDataDto {
  @ApiProperty({ example: 5, description: 'Days remaining until launch' })
  days: number;

  @ApiProperty({ example: 12, description: 'Hours remaining until launch' })
  hours: number;

  @ApiProperty({ example: 30, description: 'Minutes remaining until launch' })
  minutes: number;

  @ApiProperty({ example: 45, description: 'Seconds remaining until launch' })
  seconds: number;

  @ApiProperty({ example: 476445000, description: 'Total milliseconds remaining' })
  totalMs: number;
}

export class ProjectCountdownResponseDto {
  @ApiProperty({ example: '5c14fe70-1818-466c-95f9-0904f1c5b38c', description: 'Project ID' })
  projectId: string;

  @ApiProperty({ example: 'SkyView Towers', description: 'Project name' })
  projectName: string;

  @ApiProperty({ example: 'skyview-towers', description: 'Project slug' })
  slug: string;

  @ApiProperty({ example: '2025-11-15', description: 'Launch date (YYYY-MM-DD)' })
  launchDate: string;

  @ApiProperty({ example: '10:00', description: 'Launch time (HH:MM format)' })
  launchTime: string;

  @ApiProperty({ example: 'Asia/Ho_Chi_Minh', description: 'Timezone (IANA timezone)' })
  timezone: string;

  @ApiProperty({ type: CountdownDataDto, description: 'Countdown data' })
  countdown: CountdownDataDto;

  @ApiProperty({ example: false, description: 'Whether the launch is currently live' })
  isLive: boolean;

  @ApiProperty({
    enum: ProjectStatus,
    example: 'UPCOMING',
    description: 'Project status',
    enumName: 'ProjectStatus',
  })
  status: string;

  @ApiProperty({ example: '2025-11-10T10:00:00.000Z', description: 'Server timestamp' })
  serverTime: string;
}

export class ProjectResponseDto {
  @ApiProperty({ example: '5c14fe70-1818-466c-95f9-0904f1c5b38c', description: 'Project ID' })
  id: string;

  @ApiProperty({ example: 'SkyView Towers', description: 'Project name' })
  name: string;

  @ApiProperty({ example: 'skyview-towers', description: 'Project slug' })
  slug: string;

  @ApiProperty({ example: 'Luxury high-rise towers...', description: 'Project description', required: false, nullable: true })
  description: string | null;

  @ApiProperty({ example: 'Vinhomes', description: 'Developer name' })
  developer: string;

  @ApiProperty({ example: 'District 1, Ho Chi Minh City', description: 'Project location', required: false, nullable: true })
  location: string | null;

  @ApiProperty({ example: '2025-11-15T00:00:00.000Z', description: 'Launch date' })
  launchDate: Date;

  @ApiProperty({ example: '10:00', description: 'Launch time (HH:MM format)' })
  launchTime: string;

  @ApiProperty({ example: 'Asia/Ho_Chi_Minh', description: 'Timezone', default: 'UTC' })
  timezone: string;

  @ApiProperty({
    enum: ProjectStatus,
    example: 'UPCOMING',
    description: 'Project status',
    enumName: 'ProjectStatus',
  })
  status: ProjectStatus | string;

  @ApiProperty({ example: 'https://example.com/logo.png', description: 'Logo URL', required: false, nullable: true })
  logoUrl: string | null;

  @ApiProperty({ example: '#2563eb', description: 'Primary color (hex)', required: false, nullable: true })
  primaryColor: string | null;

  @ApiProperty({ example: '#1e40af', description: 'Secondary color (hex)', required: false, nullable: true })
  secondaryColor: string | null;

  @ApiProperty({ example: 'https://example.com/hero.jpg', description: 'Hero image URL', required: false, nullable: true })
  heroImageUrl: string | null;

  @ApiProperty({ example: 'https://example.com/video.mp4', description: 'How to Reserve video URL', required: false, nullable: true })
  videoUrl: string | null;

  @ApiProperty({ example: 'https://example.com/terms.pdf', description: 'Terms URL', required: false, nullable: true })
  termsUrl: string | null;

  @ApiProperty({ example: 'https://example.com/policy.pdf', description: 'Policy URL', required: false, nullable: true })
  policyUrl: string | null;

  @ApiProperty({ example: 10, description: 'Reservation duration in minutes', default: 10 })
  reservationDuration: number;

  @ApiProperty({ example: 500000.00, description: 'Deposit amount' })
  depositAmount: number;

  @ApiProperty({ example: '2025-11-10T10:00:00.000Z', description: 'Created timestamp' })
  createdAt: Date;

  @ApiProperty({ example: '2025-11-10T10:00:00.000Z', description: 'Updated timestamp' })
  updatedAt: Date;
}

export class ProjectsListResponseDto {
  @ApiProperty({ type: [ProjectResponseDto], description: 'List of projects' })
  data: ProjectResponseDto[];
}

export class ProjectCountdownApiResponseDto {
  @ApiProperty({ example: true, description: 'Success status' })
  success: boolean;

  @ApiProperty({ type: ProjectCountdownResponseDto, description: 'Countdown data' })
  data: ProjectCountdownResponseDto;
}

export class ProjectApiResponseDto {
  @ApiProperty({ example: true, description: 'Success status' })
  success: boolean;

  @ApiProperty({ type: ProjectResponseDto, description: 'Project data' })
  data: ProjectResponseDto;
}

export class ProjectsListApiResponseDto {
  @ApiProperty({ example: true, description: 'Success status' })
  success: boolean;

  @ApiProperty({ type: [ProjectResponseDto], description: 'List of projects' })
  data: ProjectResponseDto[];
}

