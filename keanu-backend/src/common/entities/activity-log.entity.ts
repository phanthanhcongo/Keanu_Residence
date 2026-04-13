import { Expose } from 'class-transformer';

@Expose()
export class ActivityLogEntity {
  id: string;
  userId: string;
  action: string; // VARCHAR(100) - 'UNIT_UPLOAD', 'PROJECT_CREATE', etc.
  entity: string; // VARCHAR(50) - 'Unit', 'Project', 'Reservation'
  entityId?: string; // VARCHAR(25)
  metadata?: Record<string, any>; // JSONB - Additional context
  ipAddress?: string; // VARCHAR(45) - IPv4 or IPv6
  userAgent?: string; // TEXT
  createdAt: Date;
}