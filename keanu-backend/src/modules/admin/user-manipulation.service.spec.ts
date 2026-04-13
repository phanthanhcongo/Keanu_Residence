import { UserManipulationService } from './user-manipulation.service';

describe('UserManipulationService', () => {
  jest.useFakeTimers();

  const mockPrisma = {
    userManipulation: {
      findFirst: jest.fn(),
    },
  } as any;

  const service = new UserManipulationService(mockPrisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns delta from latest milestone and caches for 2 seconds', async () => {
    const firstMilestone = new Date('2026-01-15T17:50:00Z');
    mockPrisma.userManipulation.findFirst.mockResolvedValue({
      delta: 25,
      milestone: firstMilestone,
    });

    jest.setSystemTime(firstMilestone);

    const first = await service.getCurrentDelta();
    const second = await service.getCurrentDelta();

    expect(first).toBe(25);
    expect(second).toBe(25);
    expect(mockPrisma.userManipulation.findFirst).toHaveBeenCalledTimes(1);
  });

  it('refreshes cache after TTL expires', async () => {
    const initialTime = new Date('2026-01-15T17:50:00Z');
    jest.setSystemTime(initialTime);

    mockPrisma.userManipulation.findFirst.mockResolvedValueOnce({
      delta: 25,
      milestone: initialTime,
    });

    await service.getCurrentDelta(); // fills cache
    expect(mockPrisma.userManipulation.findFirst).toHaveBeenCalledTimes(1);

    // Advance beyond TTL (2s)
    jest.advanceTimersByTime(3000);
    const laterTime = new Date(initialTime.getTime() + 3000);
    jest.setSystemTime(laterTime);

    mockPrisma.userManipulation.findFirst.mockResolvedValueOnce({
      delta: 35,
      milestone: laterTime,
    });

    const refreshed = await service.getCurrentDelta();

    expect(refreshed).toBe(35);
    expect(mockPrisma.userManipulation.findFirst).toHaveBeenCalledTimes(2);
  });
});
