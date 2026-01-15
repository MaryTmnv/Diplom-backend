// src/modules/messages/messages.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/modules/database/prisma.service';
import { MessagesService } from '../messages.service';


@WebSocketGateway({
  namespace: 'chat',
  cors: {
    origin: (origin, callback) => {
      // Разрешить localhost
      if (!origin || origin.startsWith('http://localhost')) {
        return callback(null, true);
      }
      
      // Разрешить все Vercel deployments
      if (origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }
      
      console.log('❌ CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  },
})
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, Socket>();

  constructor(
    private jwtService: JwtService,
    private messagesService: MessagesService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);

      if (!token) {
        console.log('❌ No token provided');
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);

      client.data.userId = payload.sub;
      client.data.email = payload.email;
      client.data.role = payload.role;

      this.connectedUsers.set(payload.sub, client);

      console.log(`✅ Client connected: ${client.id}, User: ${payload.email}`);

      client.emit('connected', {
        message: 'Successfully connected to chat',
        userId: payload.sub,
      });
    } catch (error) {
      console.log('❌ Connection error:', error.message);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      this.connectedUsers.delete(userId);
    }
    console.log(`❌ Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-ticket')
  async handleJoinTicket(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { ticketId: string },
  ) {
    const { ticketId } = data;
    const userId = client.data.userId;

    console.log(`👤 User ${userId} joining ticket ${ticketId}`);

    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      client.emit('error', { message: 'Заявка не найдена' });
      return;
    }

    const userRole = client.data.role;
    if (userRole === 'CLIENT' && ticket.clientId !== userId) {
      client.emit('error', { message: 'Нет доступа к этой заявке' });
      return;
    }

    client.join(`ticket-${ticketId}`);

    client.to(`ticket-${ticketId}`).emit('user-joined', {
      userId,
      ticketId,
    });

    client.emit('joined-ticket', { ticketId });
    
    console.log(`✅ User ${userId} joined ticket ${ticketId}`);
  }

  @SubscribeMessage('leave-ticket')
  handleLeaveTicket(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { ticketId: string },
  ) {
    const { ticketId } = data;
    const userId = client.data.userId;

    console.log(`👤 User ${userId} leaving ticket ${ticketId}`);

    client.leave(`ticket-${ticketId}`);

    client.to(`ticket-${ticketId}`).emit('user-left', {
      userId,
      ticketId,
    });
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { ticketId: string; isTyping: boolean },
  ) {
    const { ticketId, isTyping } = data;
    const userId = client.data.userId;

    client.to(`ticket-${ticketId}`).emit('user-typing', {
      userId,
      ticketId,
      isTyping,
    });
  }

  // Метод для отправки сообщения из сервиса
  notifyNewMessage(ticketId: string, message: any) {
    console.log(`📨 Broadcasting message to ticket-${ticketId}`);
    this.server.to(`ticket-${ticketId}`).emit('new-message', message);
  }

  notifyTicketUpdated(ticketId: string, data: any) {
    this.server.to(`ticket-${ticketId}`).emit('ticket-updated', data);
  }

  notifyMessageRead(ticketId: string, messageId: string, userId: string) {
    this.server.to(`ticket-${ticketId}`).emit('message-read', {
      messageId,
      userId,
      readAt: new Date(),
    });
  }

  private extractToken(client: Socket): string | null {
    const authToken = client.handshake?.auth?.token;
    if (authToken) return authToken;

    const queryToken = client.handshake?.query?.token;
    if (queryToken && typeof queryToken === 'string') return queryToken;

    const headerToken = client.handshake?.headers?.authorization;
    if (headerToken) {
      return headerToken.replace('Bearer ', '');
    }

    return null;
  }
}
