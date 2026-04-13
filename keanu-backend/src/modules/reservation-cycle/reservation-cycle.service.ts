import { Injectable } from '@nestjs/common';

export type ReservationCycleState = 'DISABLED' | 'ACTIVE';

@Injectable()
export class ReservationCycleService {
  // Mốc chung cho mọi người (hoặc có thể config)
  private readonly startTime = new Date('2025-01-01T00:00:00Z').getTime();

  // Tổng 1 chu kỳ = 50 phút (10p disable + 30p active + 10p disable)
  private readonly cycleMs = 50 * 60 * 1000;

  getState(): {
    state: ReservationCycleState;
    remainingMs: number;
    remainingMinutes: number;
    nextState: ReservationCycleState;
  } {
    const now = Date.now();
    const elapsed = (now - this.startTime) % this.cycleMs;

    let state: ReservationCycleState;
    let remainingMs: number;
    let nextState: ReservationCycleState;

    if (elapsed < 10 * 60 * 1000) {
      // 0–10 phút: DISABLED
      state = 'DISABLED';
      nextState = 'ACTIVE';
      remainingMs = 10 * 60 * 1000 - elapsed;
    } else if (elapsed < 40 * 60 * 1000) {
      // 10–40 phút: ACTIVE
      state = 'ACTIVE';
      nextState = 'DISABLED';
      remainingMs = 40 * 60 * 1000 - elapsed;
    } else {
      // 40–50 phút: DISABLED
      state = 'DISABLED';
      nextState = 'ACTIVE';
      remainingMs = 50 * 60 * 1000 - elapsed;
    }

    const remainingMinutes = Math.ceil(remainingMs / 60000);
    return { state, remainingMs, remainingMinutes, nextState };
  }
}
