import { Controller, Get } from '@nestjs/common';
import { ReservationCycleService } from './reservation-cycle.service';

@Controller('reservation-cycle')
export class ReservationCycleController {
  constructor(private readonly cycleService: ReservationCycleService) {}

  @Get('status')
  getStatus() {
    const { state, remainingMs, remainingMinutes, nextState } =
      this.cycleService.getState();

    return {
      success: true,
      data: {
        state,
        nextState,
        remainingMs,
        remainingMinutes,
        serverTime: new Date().toISOString(),
      },
    };
  }
}
