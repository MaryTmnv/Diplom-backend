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
import { NotificationsService } from '../notifications.service';

@WebSocketGateway({
  namespace: 'notifications',
  cors: {
    origin: process.env.FRONTEND_URL || 'https://help-mate-nzq4q5gyb-marytmnvs-projects.vercel.app/',
    credentials: true,
  },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  // Храним активных пользователей: userId -> Socket
  private connectedUsers = new Map<string, Socket>();

  constructor(
    private jwtService: JwtService,
    private notificationsService: NotificationsService,
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

      // Сохраняем данные пользователя
      client.data.userId = payload.sub;
      client.data.email = payload.email;
      client.data.role = payload.role;

      // Добавляем в список активных пользователей
      this.connectedUsers.set(payload.sub, client);

      // Присоединяем к личной комнате
      client.join(`user-${payload.sub}`);

      console.log(`✅ Notifications client connected: ${client.id}, User: ${payload.email}`);

      // Отправляем количество непрочитанных уведомлений
      const unreadCount = await this.notificationsService.getUnreadCount(payload.sub);

      client.emit('connected', {
        message: 'Successfully connected to notifications',
        userId: payload.sub,
        unreadCount,
      });
    } catch (error) {
      console.log('❌ Notifications connection error:', error.message);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      this.connectedUsers.delete(userId);
      console.log(`❌ Notifications client disconnected: ${client.id}`);
    }
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    client.join(`user-${userId}`);
    
    console.log(`👤 User ${userId} subscribed to notifications`);
    
    client.emit('subscribed', {
      userId,
      message: 'Successfully subscribed to notifications',
    });
  }

  @SubscribeMessage('get-unread-count')
  async handleGetUnreadCount(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    const count = await this.notificationsService.getUnreadCount(userId);

    client.emit('unread-count', { count });
  }

  // Метод для отправки уведомления конкретному пользователю
  sendNotification(userId: string, notification: any) {
    this.server.to(`user-${userId}`).emit('notification', notification);
    
    console.log(`📨 Notification sent to user ${userId}:`, notification.title);
  }

  // Метод для отправки уведомления нескольким пользователям
  sendNotificationToMultiple(userIds: string[], notification: any) {
    userIds.forEach((userId) => {
      this.sendNotification(userId, notification);
    });
  }

  // Метод для broadcast уведомления всем онлайн пользователям определённой роли
  broadcastToRole(role: string, notification: any) {
    this.connectedUsers.forEach((socket, userId) => {
      if (socket.data.role === role) {
        this.sendNotification(userId, notification);
      }
    });
  }

  // Обновление счётчика непрочитанных
  updateUnreadCount(userId: string, count: number) {
    this.server.to(`user-${userId}`).emit('unread-count', { count });
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
