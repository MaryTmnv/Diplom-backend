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
import { UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/modules/database/prisma.service';
import { CreateMessageDto } from '../dto/create-message.dto';
import { MessagesService } from '../messages.service';


@WebSocketGateway({
  namespace: 'chat',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
})
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Храним активных пользователей
  private connectedUsers = new Map<string, Socket>();

  constructor(
    private jwtService: JwtService,
    private messagesService: MessagesService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      // Извлекаем токен
      const token = this.extractToken(client);

      if (!token) {
        console.log('❌ No token provided');
        client.disconnect();
        return;
      }

      // Верифицируем токен
      const payload = this.jwtService.verify(token);

      // Сохраняем данные пользователя в сокете
      client.data.userId = payload.sub;
      client.data.email = payload.email;
      client.data.role = payload.role;

      // Добавляем в список активных пользователей
      this.connectedUsers.set(payload.sub, client);

      console.log(`✅ Client connected: ${client.id}, User: ${payload.email}`);

      // Отправляем подтверждение подключения
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

    // Проверяем доступ к заявке
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      client.emit('error', { message: 'Заявка не найдена' });
      return;
    }

    // Проверка прав доступа
    const userRole = client.data.role;
    if (userRole === 'CLIENT' && ticket.clientId !== userId) {
      client.emit('error', { message: 'Нет доступа к этой заявке' });
      return;
    }

    // Присоединяемся к комнате заявки
    client.join(`ticket-${ticketId}`);

    // Уведомляем других участников
    client.to(`ticket-${ticketId}`).emit('user-joined', {
      userId,
      ticketId,
    });

    client.emit('joined-ticket', { ticketId });
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

    // Уведомляем других участников
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

    // Отправляем всем в комнате, кроме отправителя
    client.to(`ticket-${ticketId}`).emit('user-typing', {
      userId,
      ticketId,
      isTyping,
    });
  }

  @SubscribeMessage('send-message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { ticketId: string; message: CreateMessageDto },
  ) {
    const { ticketId, message } = data;
    const userId = client.data.userId;
    const userRole = client.data.role;

    try {
      // Создаём сообщение через сервис
      const createdMessage = await this.messagesService.create(
        ticketId,
        userId,
        userRole,
        message,
      );

      // Отправляем сообщение всем в комнате
      this.server.to(`ticket-${ticketId}`).emit('new-message', createdMessage);

      // Отправляем подтверждение отправителю
      client.emit('message-sent', {
        tempId: data['tempId'], // Временный ID с фронтенда
        message: createdMessage,
      });

      // TODO: Отправить push-уведомление получателю если он не онлайн
    } catch (error) {
      client.emit('error', {
        message: error.message || 'Ошибка отправки сообщения',
      });
    }
  }

  @SubscribeMessage('mark-as-read')
  async handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string },
  ) {
    const { messageId } = data;
    const userId = client.data.userId;

    try {
      const message = await this.messagesService.markAsRead(messageId, userId);

      // Уведомляем автора сообщения о прочтении
      const authorSocket = this.connectedUsers.get(message.authorId);
      if (authorSocket) {
        authorSocket.emit('message-read', {
          messageId,
          readAt: message.readAt,
          readBy: userId,
        });
      }
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  // Метод для отправки сообщения из других сервисов
  notifyNewMessage(ticketId: string, message: any) {
    this.server.to(`ticket-${ticketId}`).emit('new-message', message);
  }

  // Метод для уведомления об обновлении заявки
  notifyTicketUpdated(ticketId: string, data: any) {
    this.server.to(`ticket-${ticketId}`).emit('ticket-updated', data);
  }
  
  private extractToken(client: Socket): string | null {
    // Токен может быть передан через:
    // 1. Handshake auth
    const authToken = client.handshake?.auth?.token;
    if (authToken) return authToken;

    // 2. Query параметры
    const queryToken = client.handshake?.query?.token;
    if (queryToken && typeof queryToken === 'string') return queryToken;

    // 3. Headers
    const headerToken = client.handshake?.headers?.authorization;
    if (headerToken) {
      return headerToken.replace('Bearer ', '');
    }

    return null;
  }
  
}
