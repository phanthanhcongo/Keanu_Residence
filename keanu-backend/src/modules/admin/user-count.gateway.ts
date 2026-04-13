import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { AdminService } from './admin.service';

@WebSocketGateway({
  namespace: '/user-count',
  cors: { origin: true, credentials: true },
})
@Injectable()
export class UserCountGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy {
  private readonly logger = new Logger(UserCountGateway.name);

  @WebSocketServer()
  server: Server;

  private broadcastInterval: NodeJS.Timeout;

  constructor(private readonly adminService: AdminService) { }

  afterInit() {
    this.logger.log('UserCount WebSocket Gateway initialized');

    // Broadcast every 2 seconds to align with milestone interval
    // this.broadcastInterval = setInterval(async () => {
    //   await this.broadcastUserCount();
    // }, 2000);

    // Initial broadcast
    this.broadcastUserCount();
  }

  handleConnection(client: Socket) {
    this.logger.log(`[WebSocket] Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`[WebSocket] Client disconnected: ${client.id}`);
  }

  private async broadcastUserCount() {
    try {
      const count = await this.adminService.getManipulatedUserCount();

      this.server.emit('userCountUpdate', {
        count,
        timestamp: Date.now(),
      });

      // Change to log level for visibility
      // this.logger.log(`Broadcasted user count: ${count}`);
    } catch (error) {
      this.logger.error('Error broadcasting user count:', error);
    }
  }

  onModuleDestroy() {
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.logger.log('UserCount broadcast interval cleared');
    }
  }
}
