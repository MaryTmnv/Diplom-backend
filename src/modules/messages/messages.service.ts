import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UserRole, EventType } from '@prisma/client';
import { MessagesGateway } from './messages/messages.gateway';

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => MessagesGateway))
    private messagesGateway: MessagesGateway,
  ) {}

  async create(
    ticketId: string,
    authorId: string,
    role: UserRole,
    dto: CreateMessageDto,
  ) {
    // Проверяем заявку
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
      throw new ForbiddenException(
        'Клиенты не могут создавать внутренние сообщения',
      );
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

    // ✅ Отправляем через WebSocket
    this.messagesGateway.notifyNewMessage(ticketId, message);

    console.log(`📨 Message created in ticket ${ticketId}`);

    return message;
  }

  async findAll(ticketId: string, userId: string, role: UserRole) {
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
  async markMultipleAsRead(messageIds: string[], userId: string) {
  if (!messageIds || messageIds.length === 0) {
    return { updated: 0 };
  }

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

  // Получаем обновлённые сообщения для уведомлений
  const updatedMessages = await this.prisma.message.findMany({
    where: {
      id: { in: messageIds },
      readAt: { not: null },
    },
    select: {
      id: true,
      ticketId: true,
      authorId: true,
      readAt: true,
    },
  });

  // Уведомляем авторов через WebSocket
  for (const message of updatedMessages) {
    this.messagesGateway.notifyMessageRead(
      message.ticketId,
      message.id,
      userId,
    );
  }

  console.log(`✅ Marked ${result.count} messages as read`);

  return { updated: result.count };
}

  async markAsRead(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Сообщение не найдено');
    }

    if (message.authorId === userId || message.readAt) {
      return message;
    }

    const updatedMessage = await this.prisma.message.update({
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

    // Уведомляем через WebSocket
    this.messagesGateway.notifyMessageRead(
      message.ticketId,
      messageId,
      userId,
    );

    return updatedMessage;
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
