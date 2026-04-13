
import { Test, TestingModule } from '@nestjs/testing';
import { ReservationsService } from './reservations.service';
import { PrismaService } from '../../common/services/prisma.service';
import { ReservationLockService } from './reservation-lock.service';
import { PaymentsService } from '../payments/payments.service';
import { GHLContactService } from '../integrations/ghl/ghl-contact.service';
import { EmailService } from '../notifications/email.service';
import { ReservationsGateway } from './reservations.gateway';
import { ShortlistService } from '../shortlist/shortlist.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateReservationDto } from './dto/create-reservation.dto';

describe('ReservationsService', () => {
    let service: ReservationsService;
    let prismaService: PrismaService;
    let lockService: ReservationLockService;

    const mockPrismaService = {
        user: {
            findUnique: jest.fn(),
        },
        unit: {
            findUnique: jest.fn(),
            update: jest.fn(),
        },
        reservation: {
            findFirst: jest.fn(),
            findMany: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            count: jest.fn(),
        },
    };

    const mockReservationLockService = {
        lockUnit: jest.fn(),
        unlockUnit: jest.fn(),
        isUnitAvailable: jest.fn(),
    };

    const mockPaymentsService = {
        createPaymentIntent: jest.fn(),
    };

    const mockGHLContactService = {
        upsertContactFromUser: jest.fn().mockResolvedValue(true),
    };

    const mockEmailService = {
        sendReservationFormStartedEmail: jest.fn().mockResolvedValue(true),
        sendBookingConfirmationEmail: jest.fn().mockResolvedValue(true),
        sendShortlistDepositNotificationEmail: jest.fn().mockResolvedValue(true),
    };

    const mockReservationsGateway = {
        emitUnitLocked: jest.fn(),
        emitReservationCancelled: jest.fn(),
        emitUnitUnlocked: jest.fn(),
        emitReservationUpdated: jest.fn(),
        emitReservationExpired: jest.fn(),
    };

    const mockShortlistService = {
        getUsersWhoShortlistedUnit: jest.fn().mockResolvedValue([]),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ReservationsService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
                {
                    provide: ReservationLockService,
                    useValue: mockReservationLockService,
                },
                {
                    provide: PaymentsService,
                    useValue: mockPaymentsService,
                },
                {
                    provide: GHLContactService,
                    useValue: mockGHLContactService,
                },
                {
                    provide: EmailService,
                    useValue: mockEmailService,
                },
                {
                    provide: ReservationsGateway,
                    useValue: mockReservationsGateway,
                },
                {
                    provide: ShortlistService,
                    useValue: mockShortlistService,
                },
            ],
        }).compile();

        service = module.get<ReservationsService>(ReservationsService);
        prismaService = module.get<PrismaService>(PrismaService);
        lockService = module.get<ReservationLockService>(ReservationLockService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createReservation', () => {
        const userId = 'user-123';
        const unitId = 'unit-123';
        const dto: CreateReservationDto = { unitId } as CreateReservationDto;

        const mockUser = {
            id: userId,
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            phoneNumber: '+1234567890',
        };

        const mockUnit = {
            id: unitId,
            projectId: 'project-123',
            status: 'AVAILABLE',
            unitNumber: 'A1',
            unitType: 'Villa',
            price: 100000,
        };

        it('should successfully create a reservation', async () => {
            // Mocks
            (mockPrismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
            (mockPrismaService.unit.findUnique as jest.Mock).mockResolvedValue(mockUnit);
            (mockPrismaService.reservation.findFirst as jest.Mock).mockResolvedValue(null); // No existing reservation
            (mockPrismaService.unit.update as jest.Mock).mockResolvedValue(mockUnit);

            const createdReservation = {
                id: 'res-123',
                userId,
                unitId,
                status: 'PENDING',
                unit: mockUnit,
                user: mockUser,
            };
            (mockPrismaService.reservation.create as jest.Mock).mockResolvedValue(createdReservation);

            // Execute
            const result = await service.createReservation(userId, dto);

            // Verify
            expect(result.success).toBe(true);
            expect(prismaService.unit.update).toHaveBeenCalledWith({
                where: { id: unitId },
                data: { status: 'LOCKED' },
            });
            expect(lockService.lockUnit).toHaveBeenCalled();
            expect(prismaService.reservation.create).toHaveBeenCalled();
            expect(mockReservationsGateway.emitUnitLocked).toHaveBeenCalledWith(unitId, 'res-123');
        });

        it('should throw error if user not found', async () => {
            (mockPrismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(service.createReservation(userId, dto))
                .rejects.toThrow('User not found');
        });

        it('should throw error if user profile is incomplete', async () => {
            const incompleteUser = { ...mockUser, email: null };
            (mockPrismaService.user.findUnique as jest.Mock).mockResolvedValue(incompleteUser);

            await expect(service.createReservation(userId, dto))
                .rejects.toThrow(/Please complete your profile/);
        });

        it('should throw error if unit not available', async () => {
            (mockPrismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
            const soldUnit = { ...mockUnit, status: 'SOLD' };
            (mockPrismaService.unit.findUnique as jest.Mock).mockResolvedValue(soldUnit);

            await expect(service.createReservation(userId, dto))
                .rejects.toThrow('Unit is not available for reservation');
        });

        it('should throw error if user already has pending reservation', async () => {
            (mockPrismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
            (mockPrismaService.unit.findUnique as jest.Mock).mockResolvedValue(mockUnit);
            (mockPrismaService.reservation.findFirst as jest.Mock).mockResolvedValue({ id: 'existing-res' });

            await expect(service.createReservation(userId, dto))
                .rejects.toThrow('You already have a pending reservation for this unit');
        });

        it('should unlock unit if reservation creation fails', async () => {
            (mockPrismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
            (mockPrismaService.unit.findUnique as jest.Mock).mockResolvedValue(mockUnit);
            (mockPrismaService.reservation.findFirst as jest.Mock).mockResolvedValue(null);
            (mockPrismaService.unit.update as jest.Mock).mockResolvedValue(mockUnit);

            // Force error during creation
            (mockPrismaService.reservation.create as jest.Mock).mockRejectedValue(new Error('DB Error'));

            await expect(service.createReservation(userId, dto))
                .rejects.toThrow('DB Error');

            expect(lockService.unlockUnit).toHaveBeenCalledWith(unitId, userId);
        });
    });

    describe('cancelReservation', () => {
        const userId = 'user-123';
        const reservationId = 'res-123';

        const mockReservation = {
            id: reservationId,
            userId,
            unitId: 'unit-123',
            status: 'PENDING',
            unit: { id: 'unit-123' },
            user: { id: userId },
        };

        it('should successfully cancel a reservation', async () => {
            (mockPrismaService.reservation.findFirst as jest.Mock).mockResolvedValue(mockReservation);
            (mockPrismaService.reservation.update as jest.Mock).mockResolvedValue({
                ...mockReservation,
                status: 'CANCELLED',
            });

            const result = await service.cancelReservation(reservationId, userId);

            expect(result).toBeDefined();
            expect(prismaService.reservation.update).toHaveBeenCalledWith(
                expect.objectContaining({ where: { id: reservationId } }),
            );
            expect(lockService.unlockUnit).toHaveBeenCalledWith('unit-123', userId);
            expect(prismaService.unit.update).toHaveBeenCalledWith({
                where: { id: 'unit-123' },
                data: { status: 'AVAILABLE' },
            });
        });

        it('should throw error if reservation not found/not pending', async () => {
            (mockPrismaService.reservation.findFirst as jest.Mock).mockResolvedValue(null);

            await expect(service.cancelReservation(reservationId, userId))
                .rejects.toThrow('Reservation not found');
        });
    });
});
