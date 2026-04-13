import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';

@WebSocketGateway({
  namespace: '/projects',
  cors: {
    origin: true, // adjust for prod - specify your domains
    credentials: true,
  },
})
@Injectable()
export class ProjectGateway {
  private readonly logger = new Logger(ProjectGateway.name);

  @WebSocketServer()
  server: Server;

  // Emit project live event — client listens to 'project:live'
  emitProjectLive(projectId: string) {
    this.logger.log(`Emitting project:live for ${projectId}`);
    this.server.emit('project:live', { projectId, timestamp: Date.now() });
  }
}
