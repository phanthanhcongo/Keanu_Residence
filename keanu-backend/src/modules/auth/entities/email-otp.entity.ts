import { Expose } from 'class-transformer';

@Expose()
export class EmailOtpEntity {
  id: string;
  userId: string;
  code: string; // VARCHAR(6)
  email: string; // VARCHAR(255)
  expiresAt: Date;
  verified: boolean;
  attempts: number;
  createdAt: Date;
}

