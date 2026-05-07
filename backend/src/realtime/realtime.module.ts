import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Injectable, Logger, Module } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService, ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Tip } from '../tips/tip.entity';

@Injectable()
@WebSocketGateway({
  cors: { origin: (process.env.CORS_ORIGINS ?? 'http://localhost:4200').split(','), credentials: true },
  namespace: '/realtime',
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger('RealtimeGateway');

  constructor(
    private readonly jwt: JwtService,
    private readonly cfg: ConfigService,
  ) {}

  // ── Auth on connect ─────────────────────────────────────────────────────
  async handleConnection(client: Socket) {
    try {
      const token = (client.handshake.auth?.token || client.handshake.headers.authorization?.replace('Bearer ', '')) as string | undefined;
      if (!token) { client.disconnect(); return; }

      const payload = await this.jwt.verifyAsync(token, { secret: this.cfg.get('JWT_ACCESS_SECRET') });
      client.data.userId = payload.sub;
      client.data.role   = payload.role;
      client.join(`user:${payload.sub}`);
      if (payload.role === 'admin') client.join('admins');

      this.logger.log(`Connected: user=${payload.sub} socket=${client.id}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Disconnected: user=${client.data?.userId} socket=${client.id}`);
  }

  // ── Client subscriptions ────────────────────────────────────────────────
  @SubscribeMessage('watch:ticker')
  onWatchTicker(@ConnectedSocket() client: Socket, @MessageBody() ticker: string) {
    if (typeof ticker !== 'string') return;
    client.join(`ticker:${ticker.toUpperCase()}`);
    return { joined: `ticker:${ticker.toUpperCase()}` };
  }

  @SubscribeMessage('unwatch:ticker')
  onUnwatch(@ConnectedSocket() client: Socket, @MessageBody() ticker: string) {
    client.leave(`ticker:${ticker.toUpperCase()}`);
  }

  @SubscribeMessage('watch:analyst')
  onWatchAnalyst(@ConnectedSocket() client: Socket, @MessageBody() analystId: number) {
    client.join(`analyst:${analystId}`);
  }

  // ── Broadcast helpers ───────────────────────────────────────────────────
  broadcastNewTip(tip: Tip) {
    this.server.emit('feed:new-tip', { id: tip.id, userId: tip.userId, ticker: tip.ticker, tipType: tip.tipType, isPaid: tip.isPaid });
    this.server.to(`ticker:${tip.ticker}`).emit('ticker:new-tip', tip);
    this.server.to(`analyst:${tip.userId}`).emit('analyst:new-tip', tip);
  }

  broadcastPriceUpdate(ticker: string, price: number, change: number) {
    this.server.to(`ticker:${ticker.toUpperCase()}`).emit('price:update', { ticker, price, change });
  }

  broadcastToUser(userId: number, event: string, payload: any) {
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  broadcastToAdmins(event: string, payload: any) {
    this.server.to('admins').emit(event, payload);
  }

  notifyNewSubscriber(analystId: number, subscriber: { id: number; name: string; handle: string }) {
    this.server.to(`user:${analystId}`).emit('subscription:new', subscriber);
  }
}

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get('JWT_ACCESS_SECRET'),
      }),
    }),
  ],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
