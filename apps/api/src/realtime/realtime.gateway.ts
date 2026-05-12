import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  namespace: '/realtime',
  cors: {
    origin: '*',
  },
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  handleConnection(client: Socket): void {
    this.logger.log(`Socket connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Socket disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-tenant')
  handleJoinTenant(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { tenantId?: string },
  ): { ok: boolean } {
    if (!payload?.tenantId) {
      return { ok: false };
    }

    void client.join(this.tenantRoom(payload.tenantId));
    return { ok: true };
  }

  emitTenantEvent(tenantId: string, event: string, payload: unknown): void {
    this.server.to(this.tenantRoom(tenantId)).emit(event, payload);
  }

  private tenantRoom(tenantId: string): string {
    return `tenant:${tenantId}`;
  }
}
