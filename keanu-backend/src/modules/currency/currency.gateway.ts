import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { CurrencyService } from './currency.service';

@WebSocketGateway({
  namespace: '/currency',
  cors: {
    origin: true,
    credentials: true,
  },
})
@Injectable()
export class CurrencyGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(CurrencyGateway.name);

  @WebSocketServer()
  server: Server;

  private broadcastInterval: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly currencyService: CurrencyService) {}

  afterInit() {
    this.logger.log('CurrencyGateway initialized on namespace /currency');

    // Broadcast updated rates to all clients every 60 seconds
    this.broadcastInterval = setInterval(() => {
      this.broadcastRates();
    }, 60_000);
  }

  handleConnection(client: Socket) {
    // Send the latest rates immediately when a client connects
    const data = this.currencyService.getLatestRates();
    client.emit('currency:rate', data);
  }

  handleDisconnect(_client: Socket) {
    // no-op
  }

  /** Broadcast latest rates to all connected clients */
  broadcastRates() {
    const data = this.currencyService.getLatestRates();
    this.server.emit('currency:rate', data);
  }
}
