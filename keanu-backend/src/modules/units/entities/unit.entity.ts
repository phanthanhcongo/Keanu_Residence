import { Expose } from 'class-transformer';

export enum UnitStatus {
  AVAILABLE = 'AVAILABLE',
  LOCKED = 'LOCKED',
  RESERVED = 'RESERVED',
  SOLD = 'SOLD',
  UNAVAILABLE = 'UNAVAILABLE'
}

@Expose()
export class UnitEntity {
  id: string;
  projectId: string;
  unitNumber: string;
  unitType: string; // '1BR', '2BR', etc.
  floor?: number;
  size: number; // DECIMAL(10,2) - sq ft or sq m
  bedrooms: number;
  bathrooms: number; // DECIMAL(3,1)
  price: number; // DECIMAL(12,2)
  launchPrice?: number; // DECIMAL(12,2)
  status: UnitStatus; // Default: 'AVAILABLE'

  // Details
  description?: string;
  floorPlanUrl?: string;
  imageUrls?: string[]; // JSONB - Array of image URLs
  features?: Record<string, any>; // JSONB - Flexible features object

  // Position (for visualization)
  xPosition?: number;
  yPosition?: number;

  createdAt: Date;
  updatedAt: Date;
}