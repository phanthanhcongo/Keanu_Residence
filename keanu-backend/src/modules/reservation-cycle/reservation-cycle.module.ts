import { Module } from '@nestjs/common';
import { ReservationCycleController } from './reservation-cycle.controller';
import { ReservationCycleService } from './reservation-cycle.service';
import { ReservationCycleGateway } from './reservation-cycle.gateway';

@Module({
    controllers: [ReservationCycleController],
    providers: [ReservationCycleService, ReservationCycleGateway],
    exports: [ReservationCycleService],
})
export class ReservationCycleModule {}
