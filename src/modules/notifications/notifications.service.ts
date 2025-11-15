import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NotificationFiltersDto } from './dto/notification-filters.dto';
import { NotificationType } from '@prisma/client';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        entityId: dto.entityId,
        entityType: dto.entityType,
      },
    });
  }

  async findAll(userId: string, filters: NotificationFiltersDto) {
    const where: any = { userId };

    // Фильтр по прочитанным/непрочитанным
    if (filters.unreadOnly) {
      where.isRead = false;
    }

    // Фильтр по типу
    if (filters.type) {
      where.type = filters.type;
    }

    // Пагинация
    const skip = (filters.page - 1) * filters.limit;

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: filters.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return {
      data: notifications,
      meta: {
        total,
        unreadCount,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Уведомление не найдено');
    }

    if (notification.isRead) {
      return notification;
    }

    return this.prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async markMultipleAsRead(notificationIds: string[], userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { updated: result.count };
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { updated: result.count };
  }

  async delete(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Уведомление не найдено');
    }

    await this.prisma.notification.delete({
      where: { id },
    });

    return { message: 'Уведомление удалено' };
  }

  async deleteAll(userId: string) {
    const result = await this.prisma.notification.deleteMany({
      where: { userId },
    });

    return { deleted: result.count };
  }

  // ============================================
  // Методы для создания уведомлений о событиях
  // ============================================

  async notifyTicketCreated(ticket: any) {
    // Уведомление для операторов о новой заявке
    const operators = await this.prisma.user.findMany({
      where: {
        role: { in: ['OPERATOR', 'SPECIALIST', 'MANAGER'] },
        isActive: true,
      },
    });

    const notifications = [];

    for (const operator of operators) {
      const notification = await this.create({
        userId: operator.id,
        type: NotificationType.TICKET_CREATED,
        title: 'Новая заявка',
        message: `Создана заявка ${ticket.number}: ${ticket.title}`,
        entityId: ticket.id,
        entityType: 'ticket',
      });

      notifications.push({
        userId: operator.id,
        notification,
      });
    }

    return notifications;
  }

  async notifyTicketAssigned(ticket: any) {
    if (!ticket.operatorId) return null;

    return this.create({
      userId: ticket.operatorId,
      type: NotificationType.TICKET_ASSIGNED,
      title: 'Заявка назначена на вас',
      message: `Вам назначена заявка ${ticket.number}: ${ticket.title}`,
      entityId: ticket.id,
      entityType: 'ticket',
    });
  }

  async notifyTicketStatusChanged(ticket: any, oldStatus: string) {
    // Уведомление для клиента об изменении статуса
    return this.create({
      userId: ticket.clientId,
      type: NotificationType.TICKET_UPDATED,
      title: 'Статус заявки изменён',
      message: `Статус заявки ${ticket.number} изменён: ${oldStatus} → ${ticket.status}`,
      entityId: ticket.id,
      entityType: 'ticket',
    });
  }

  async notifyTicketResolved(ticket: any) {
    return this.create({
      userId: ticket.clientId,
      type: NotificationType.TICKET_RESOLVED,
      title: 'Заявка решена',
      message: `Ваша заявка ${ticket.number} решена. Пожалуйста, оцените качество работы`,
      entityId: ticket.id,
      entityType: 'ticket',
    });
  }

  async notifyNewMessage(recipientId: string, ticket: any, message: any) {
    const authorName = `${message.author.firstName} ${message.author.lastName}`;

    return this.create({
      userId: recipientId,
      type: NotificationType.NEW_MESSAGE,
      title: 'Новое сообщение',
      message: `${authorName} отправил сообщение в заявке ${ticket.number}`,
      entityId: ticket.id,
      entityType: 'ticket',
    });
  }

  async notifyTicketEscalated(ticket: any, reason: string) {
    if (!ticket.operatorId) return null;

    return this.create({
      userId: ticket.operatorId,
      type: NotificationType.TICKET_ASSIGNED,
      title: 'Заявка эскалирована на вас',
      message: `Заявка ${ticket.number} передана вам. Причина: ${reason}`,
      entityId: ticket.id,
      entityType: 'ticket',
    });
  }

  async notifyMention(userId: string, ticket: any, message: any) {
    const authorName = `${message.author.firstName} ${message.author.lastName}`;

    return this.create({
      userId,
      type: NotificationType.MENTION,
      title: 'Вас упомянули',
      message: `${authorName} упомянул вас в заявке ${ticket.number}`,
      entityId: ticket.id,
      entityType: 'ticket',
    });
  }
}
