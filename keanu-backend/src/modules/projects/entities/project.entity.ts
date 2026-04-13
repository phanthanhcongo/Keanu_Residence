import { Expose } from 'class-transformer';

export enum ProjectStatus {
  UPCOMING = 'UPCOMING',
  LIVE = 'LIVE',
  CLOSED = 'CLOSED',
}

@Expose()
export class ProjectEntity {
  id: string;
  name: string;
  slug: string;
  description?: string;
  developer: string;
  location?: string;
  launchDate: Date;
  launchTime: string; // Format: "HH:MM"
  timezone: string; // Default: 'UTC'
  status: ProjectStatus; // Default: 'UPCOMING'
  
  // Branding
  logoUrl?: string;
  primaryColor?: string; // Hex color
  secondaryColor?: string;
  
  // Media
  heroImageUrl?: string;
  videoUrl?: string; // "How to Reserve" video
  
  // Legal
  termsUrl?: string;
  policyUrl?: string;
  
  // Settings
  reservationDuration: number; // Default: 10 (minutes)
  depositAmount: number; // DECIMAL(10,2)
  
  createdAt: Date;
  updatedAt: Date;
}