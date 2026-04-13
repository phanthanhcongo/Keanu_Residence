import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { ReservationCycleService } from './reservation-cycle.service';

@WebSocketGateway({
  cors: { origin: true, credentials: true },
})
export class ReservationCycleGateway implements OnGatewayInit {
  @WebSocketServer() server: Server;

  constructor(private readonly cycleService: ReservationCycleService) { }

  afterInit() {
    // Gửi trạng thái ban đầu và cập nhật mỗi phút
    setInterval(() => {
      const state = this.cycleService.getState();
      this.server.emit('reservationCycleUpdate', state);
    }, 60 * 1000);
  }
}
