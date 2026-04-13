import { Expose } from 'class-transformer';

@Expose()
export class ShortlistEntity {
  id: string;
  userId: string;
  unitId: string;
  createdAt: Date;
}