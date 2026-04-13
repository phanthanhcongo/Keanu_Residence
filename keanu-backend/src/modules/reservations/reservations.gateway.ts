import { WebSocketGateway, WebSocketServer, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';

@WebSocketGateway({
  namespace: '/reservations',
  cors: {
    origin: true, // adjust for prod - specify your domains
    credentials: true,
  },
})
@Injectable()
export class ReservationsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ReservationsGateway.name);

  @WebSocketServer()
  server: Server;

  afterInit(server: Server) {
    // this.logger.log(`ReservationsGateway initialized on namespace /reservations`);
  }

  handleConnection(client: Socket) {
    // this.logger.log(`Client connected to /reservations: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    // this.logger.log(`Client disconnected from /reservations: ${client.id}`);
  }

  /**
   * Emit reservation expired event
   */
  emitReservationExpired(reservationId: string, unitId: string) {
    // this.logger.log(`Emitting reservation:expired for ${reservationId}`);
    this.server.emit('reservation:expired', { reservationId, unitId, timestamp: Date.now() });
  }

  /**
   * Emit reservation cancelled event
   */
  emitReservationCancelled(reservationId: string, unitId: string) {
    // this.logger.log(`Emitting reservation:cancelled for ${reservationId}`);
    this.server.emit('reservation:cancelled', { reservationId, unitId, timestamp: Date.now() });
  }

  /**
   * Emit reservation updated event
   */
  emitReservationUpdated(reservationId: string, unitId: string, status: string) {
    // this.logger.log(`Emitting reservation:updated for ${reservationId} with status ${status}`);
    this.server.emit('reservation:updated', {
      reservationId,
      unitId,
      status,
      timestamp: Date.now()
    });
  }

  /**
   * Emit unit reserved event (for UI updates)
   */
  emitUnitReserved(unitId: string, reservationId: string) {
    // this.logger.log(`Emitting unit:reserved for unit ${unitId}`);
    this.server.emit('unit:reserved', {
      unitId,
      reservationId,
      timestamp: Date.now()
    });
  }

  /**
   * Emit unit locked event (when reservation is created)
   */
  emitUnitLocked(unitId: string, reservationId: string) {
    // this.logger.log(`Emitting unit:locked for unit ${unitId}`);
    this.server.emit('unit:locked', {
      unitId,
      reservationId,
      timestamp: Date.now()
    });
  }

  /**
   * Emit unit unlocked event (when reservation expires/cancels)
   */
  emitUnitUnlocked(unitId: string) {
    // this.logger.log(`Emitting unit:unlocked for unit ${unitId}`);
    this.server.emit('unit:unlocked', {
      unitId,
      timestamp: Date.now()
    });
  }

  /**
   * Emit project live event (when project launches — auto or manual)
   */
  emitProjectLive(projectId: string) {
    this.logger.log(`Emitting project:live for ${projectId}`);
    this.server.emit('project:live', { projectId, timestamp: Date.now() });
  }

  /**
   * Emit project status changed event (UPCOMING, CLOSED, etc.)
   */
  emitProjectStatusChanged(projectId: string, status: string) {
    this.logger.log(`Emitting project:status-changed for ${projectId} → ${status}`);
    this.server.emit('project:status-changed', { projectId, status, timestamp: Date.now() });
  }
}

