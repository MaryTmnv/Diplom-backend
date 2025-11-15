import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UserRole, EventType } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications/notifications.gateway';

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
     private notificationsService: NotificationsService,
    private notificationsGateway: NotificationsGateway

  ) {}

  async create(ticketId: string, authorId: string, role: UserRole, dto: CreateMessageDto) {
    // Проверяем, существует ли заявка
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        client: true,
        operator: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Заявка не найдена');
    }

    // Проверка прав доступа
    if (role === UserRole.CLIENT && ticket.clientId !== authorId) {
      throw new ForbiddenException('Нет доступа к этой заявке');
    }

    // Клиенты не могут создавать внутренние сообщения
    if (role === UserRole.CLIENT && dto.isInternal) {
      throw new ForbiddenException('Клиенты не могут создавать внутренние сообщения');
    }

    // Создаём сообщение
    const message = await this.prisma.message.create({
      data: {
        ticketId,
        authorId,
        content: dto.content,
        isInternal: dto.isInternal || false,
        attachments: {
          connect: dto.attachmentIds?.map((id) => ({ id })) || [],
        },
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            role: true,
          },
        },
        attachments: true,
      },
    });

    const recipientId =
      authorId === ticket.clientId ? ticket.operatorId : ticket.clientId;

    // Отправляем уведомление получателю (если сообщение не внутреннее)
    if (recipientId && !dto.isInternal) {
      const notification = await this.notificationsService.notifyNewMessage(
        recipientId,
        ticket,
        message,
      );

      // Отправляем через WebSocket
      this.notificationsGateway.sendNotification(recipientId, notification);

      // Обновляем счётчик
      const unreadCount = await this.notificationsService.getUnreadCount(recipientId);
      this.notificationsGateway.updateUnreadCount(recipientId, unreadCount);
    }

    // Обновляем timestamp заявки
    await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { updatedAt: new Date() },
    });

    // Создаём событие
    await this.prisma.ticketEvent.create({
      data: {
        ticketId,
        type: EventType.MESSAGE_SENT,
        description: dto.isInternal
          ? 'Добавлена внутренняя заметка'
          : 'Отправлено сообщение',
        userId: authorId,
      },
    });

    return message;
  }

  async findAll(ticketId: string, userId: string, role: UserRole) {
    // Проверяем доступ к заявке
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Заявка не найдена');
    }

    if (role === UserRole.CLIENT && ticket.clientId !== userId) {
      throw new ForbiddenException('Нет доступа к этой заявке');
    }

    const where: any = { ticketId };

    // Клиенты не видят внутренние заметки
    if (role === UserRole.CLIENT) {
      where.isInternal = false;
    }

    return this.prisma.message.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            role: true,
          },
        },
        attachments: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async markAsRead(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Сообщение не найдено');
    }

    // Нельзя отметить своё сообщение как прочитанное
    if (message.authorId === userId) {
      return message;
    }

    // Если уже прочитано - ничего не делаем
    if (message.readAt) {
      return message;
    }

    return this.prisma.message.update({
      where: { id: messageId },
      data: { readAt: new Date() },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            role: true,
          },
        },
      },
    });
  }

  async markMultipleAsRead(messageIds: string[], userId: string) {
    // Обновляем только те сообщения, которые:
    // 1. Не написаны текущим пользователем
    // 2. Ещё не прочитаны
    const result = await this.prisma.message.updateMany({
      where: {
        id: { in: messageIds },
        authorId: { not: userId },
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return { updated: result.count };
  }

  async getUnreadCount(ticketId: string, userId: string) {
    return this.prisma.message.count({
      where: {
        ticketId,
        authorId: { not: userId },
        readAt: null,
        isInternal: false,
      },
    });
  }
}
