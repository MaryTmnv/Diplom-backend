import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { UpdateTicketPriorityDto } from './dto/update-ticket-priority.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { EscalateTicketDto } from './dto/escalate-ticket.dto';
import { TicketFiltersDto } from './dto/ticket-filters.dto';
import { RateTicketDto } from './dto/rate-ticket.dto';
import { AddInternalNoteDto } from './dto/add-internal-note.dto';
import {
  TicketStatus,
  TicketPriority,
  TicketCategory,
  UserRole,
  EventType,
} from '@prisma/client';

@Injectable()
export class TicketsService {
  constructor(private prisma: PrismaService) {}

  async create(clientId: string, dto: CreateTicketDto) {
    // 1. Генерируем уникальный номер заявки
    const number = await this.generateTicketNumber();

    // 2. Определяем приоритет на основе контекста
    const priority = this.calculatePriority(dto);

    // 3. Создаём заявку
    const ticket = await this.prisma.ticket.create({
      data: {
        number,
        title: dto.title,
        description: dto.description,
        category: dto.category,
        priority,
        clientId,
        contextData: dto.contextData,
        attachments: {
          connect: dto.attachmentIds?.map((id) => ({ id })) || [],
        },
        events: {
          create: {
            type: EventType.CREATED,
            description: 'Заявка создана',
            userId: clientId,
          },
        },
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            avatar: true,
            clientProfile: true,
          },
        },
        attachments: true,
      },
    });

    // 4. Обновляем статистику клиента
    await this.prisma.clientProfile.update({
      where: { userId: clientId },
      data: { totalTickets: { increment: 1 } },
    });

    // 5. Автоматическое назначение (если настроено)
    // await this.autoAssignTicket(ticket.id);

    // TODO: Отправить уведомления операторам о новой заявке

    return ticket;
  }

  async findAll(userId: string, role: UserRole, filters: TicketFiltersDto) {
    const where: any = {};

    // Фильтрация по роли
    if (role === UserRole.CLIENT) {
      where.clientId = userId;
    } else if (role === UserRole.OPERATOR || role === UserRole.SPECIALIST) {
      // Оператор видит свои заявки и заявки в очереди
      where.OR = [
        { operatorId: userId },
        { operatorId: null, status: TicketStatus.NEW },
      ];
    }
    // ADMIN и MANAGER видят все заявки

    // Применяем фильтры
    if (filters.status?.length) {
      where.status = { in: filters.status };
    }

    if (filters.priority?.length) {
      where.priority = { in: filters.priority };
    }

    if (filters.category?.length) {
      where.category = { in: filters.category };
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { number: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
    }

    // Пагинация
    const skip = (filters.page - 1) * filters.limit;

    const [tickets, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        skip,
        take: filters.limit,
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
              clientProfile: true,
            },
          },
          operator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          _count: {
            select: {
              messages: {
                where: {
                  isInternal: false,
                  readAt: null,
                  authorId: { not: userId },
                },
              },
            },
          },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return {
      data: tickets.map((ticket) => ({
        ...ticket,
        unreadCount: ticket._count.messages,
      })),
      meta: {
        total,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  }

  async findOne(id: string, userId: string, role: UserRole) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        client: {
          include: {
            clientProfile: true,
          },
        },
        operator: {
          include: {
            operatorStats: true,
          },
        },
        messages: {
          where: role === UserRole.CLIENT ? { isInternal: false } : {},
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
        },
        internalNotes:
          role !== UserRole.CLIENT
            ? {
                include: {
                  author: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
                orderBy: { createdAt: 'desc' },
              }
            : false,
        attachments: true,
        events: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        rating: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Заявка не найдена');
    }

    // Проверка прав доступа
    if (role === UserRole.CLIENT && ticket.clientId !== userId) {
      throw new ForbiddenException('Нет доступа к этой заявке');
    }

    // Получаем умные подсказки для операторов
    let suggestions = null;
    if (role !== UserRole.CLIENT) {
      suggestions = await this.getSuggestions(id);
    }

    return {
      ...ticket,
      suggestions,
    };
  }

  async update(id: string, userId: string, role: UserRole, dto: UpdateTicketDto) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
    });

    if (!ticket) {
      throw new NotFoundException('Заявка не найдена');
    }

    // Только клиент-создатель может редактировать заявку
    if (role === UserRole.CLIENT && ticket.clientId !== userId) {
      throw new ForbiddenException('Нет доступа к этой заявке');
    }

    // Нельзя редактировать закрытые заявки
    if (ticket.status === TicketStatus.CLOSED) {
      throw new BadRequestException('Нельзя редактировать закрытую заявку');
    }

    return this.prisma.ticket.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        category: dto.category,
        contextData: dto.contextData,
      },
      include: {
        client: true,
        operator: true,
        attachments: true,
      },
    });
  }

  async assignTicket(ticketId: string, operatorId: string, dto?: AssignTicketDto) {
    const targetOperatorId = dto?.operatorId || operatorId;

    // Проверяем, что оператор существует и активен
    const operator = await this.prisma.user.findUnique({
      where: { id: targetOperatorId },
    });

    if (!operator || !operator.isActive) {
      throw new BadRequestException('Оператор не найден или неактивен');
    }

    if (operator.role !== UserRole.OPERATOR && operator.role !== UserRole.SPECIALIST) {
    
    }

    const ticket = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        operatorId: targetOperatorId,
        status: TicketStatus.IN_PROGRESS,
        assignedAt: new Date(),
        events: {
          create: {
            type: EventType.ASSIGNED,
            description: `Заявка назначена на оператора`,
            userId: operatorId,
          },
        },
      },
      include: {
        client: true,
        operator: true,
      },
    });

    // TODO: Отправить уведомление оператору

    return ticket;
  }

  async updateStatus(
    ticketId: string,
    userId: string,
    dto: UpdateTicketStatusDto,
  ) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Заявка не найдена');
    }

    const updateData: any = {
      status: dto.status,
      events: {
        create: {
          type: EventType.STATUS_CHANGED,
          description: `Статус изменён: ${ticket.status} → ${dto.status}`,
          userId,
          metadata: {
            oldStatus: ticket.status,
            newStatus: dto.status,
            comment: dto.comment,
          },
        },
      },
    };

    // Устанавливаем временные метки
    if (dto.status === TicketStatus.RESOLVED) {
      updateData.resolvedAt = new Date();

      // Обновляем статистику клиента
      await this.prisma.clientProfile.update({
        where: { userId: ticket.clientId },
        data: { resolvedTickets: { increment: 1 } },
      });

      // Обновляем статистику оператора
      if (ticket.operatorId) {
        await this.updateOperatorStats(ticket.operatorId, ticket);
      }
    } else if (dto.status === TicketStatus.CLOSED) {
      updateData.closedAt = new Date();
    }

    const updatedTicket = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: updateData,
      include: {
        client: true,
        operator: true,
      },
    });

    // TODO: Отправить уведомления

    return updatedTicket;
  }

  async updatePriority(
    ticketId: string,
    userId: string,
    dto: UpdateTicketPriorityDto,
  ) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Заявка не найдена');
    }

    return this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        priority: dto.priority,
        events: {
          create: {
            type: EventType.PRIORITY_CHANGED,
            description: `Приоритет изменён: ${ticket.priority} → ${dto.priority}`,
            userId,
            metadata: {
              oldPriority: ticket.priority,
              newPriority: dto.priority,
              reason: dto.reason,
            },
          },
        },
      },
      include: {
        client: true,
        operator: true,
      },
    });
  }

  async escalateTicket(ticketId: string, userId: string, dto: EscalateTicketDto) {
    // Проверяем специалиста
    const specialist = await this.prisma.user.findUnique({
      where: { id: dto.specialistId },
    });

    if (!specialist || specialist.role !== UserRole.SPECIALIST) {
      throw new BadRequestException('Специалист не найден');
    }

    const ticket = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        operatorId: dto.specialistId,
        priority: TicketPriority.HIGH, // Повышаем приоритет
        events: {
          create: {
            type: EventType.ESCALATED,
            description: 'Заявка эскалирована специалисту',
            userId,
            metadata: {
              reason: dto.reason,
              previousOperatorId: userId,
              newOperatorId: dto.specialistId,
            },
          },
        },
      },
      include: {
        client: true,
        operator: true,
      },
    });

    // TODO: Отправить уведомления

    return ticket;
  }

  async addInternalNote(ticketId: string, userId: string, dto: AddInternalNoteDto) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Заявка не найдена');
    }

    const note = await this.prisma.internalNote.create({
      data: {
        ticketId,
        authorId: userId,
        content: dto.content,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    // Создаём событие
    await this.prisma.ticketEvent.create({
      data: {
        ticketId,
        type: EventType.NOTE_ADDED,
        description: 'Добавлена внутренняя заметка',
        userId,
      },
    });

    return note;
  }

  async rateTicket(ticketId: string, clientId: string, dto: RateTicketDto) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Заявка не найдена');
    }

    if (ticket.clientId !== clientId) {
      throw new ForbiddenException('Вы не можете оценить эту заявку');
    }

    if (
      ticket.status !== TicketStatus.RESOLVED &&
      ticket.status !== TicketStatus.CLOSED
    ) {
      throw new BadRequestException('Можно оценить только решённые заявки');
    }

    // Проверяем, не оценена ли уже заявка
    const existingRating = await this.prisma.ticketRating.findUnique({
      where: { ticketId },
    });

    if (existingRating) {
      throw new BadRequestException('Заявка уже оценена');
    }

    const rating = await this.prisma.ticketRating.create({
      data: {
        ticketId,
        clientId,
        rating: dto.rating,
        feedback: dto.feedback,
        likedSpeed: dto.likedSpeed,
        likedClarity: dto.likedClarity,
        likedPoliteness: dto.likedPoliteness,
        likedCompleteness: dto.likedCompleteness,
      },
    });

    // Обновляем статистику оператора
    if (ticket.operatorId) {
      await this.updateOperatorRating(ticket.operatorId, dto.rating);
    }

    return rating;
  }

  async getHistory(ticketId: string) {
    return this.prisma.ticketEvent.findMany({
      where: { ticketId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getSuggestions(ticketId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) return null;

    // Похожие решённые заявки
    const similarTickets = await this.prisma.ticket.findMany({
      where: {
        category: ticket.category,
        status: TicketStatus.RESOLVED,
        id: { not: ticketId },
      },
      take: 5,
      orderBy: { resolvedAt: 'desc' },
      include: {
        operator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Релевантные статьи из базы знаний
    // TODO: Реализовать после создания Knowledge Base Module

    return {
      similarTickets,
      articles: [], // Заглушка
    };
  }

  async getQueue() {
    return this.prisma.ticket.findMany({
      where: {
        operatorId: null,
        status: TicketStatus.NEW,
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            clientProfile: true,
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async getMyActive(userId: string) {
    return this.prisma.ticket.findMany({
      where: {
        operatorId: userId,
        status: {
          in: [TicketStatus.NEW, TicketStatus.IN_PROGRESS, TicketStatus.WAITING],
        },
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            clientProfile: true,
          },
        },
        _count: {
          select: {
            messages: {
              where: {
                isInternal: false,
                readAt: null,
                authorId: { not: userId },
              },
            },
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  private async generateTicketNumber(): Promise<string> {
    const count = await this.prisma.ticket.count();
    return `TKT-${String(count + 1).padStart(6, '0')}`;
  }

  private calculatePriority(dto: CreateTicketDto): TicketPriority {
    // Простая логика определения приоритета
    // В реальности можно использовать ML

    const urgentKeywords = [
      'не могу войти',
      'заблокирован',
      'мошенничество',
      'украли',
      'срочно',
      'критично',
    ];
    const description = dto.description.toLowerCase();

    if (urgentKeywords.some((keyword) => description.includes(keyword))) {
      return TicketPriority.HIGH;
    }

    if (dto.category === TicketCategory.SECURITY) {
      return TicketPriority.HIGH;
    }

    return TicketPriority.MEDIUM;
  }

  private async updateOperatorStats(operatorId: string, ticket: any) {
    const resolutionTime = Math.floor(
      (ticket.resolvedAt.getTime() - ticket.createdAt.getTime()) / 60000,
    ); // в минутах

    const stats = await this.prisma.operatorStats.findUnique({
      where: { userId: operatorId },
    });

    if (stats) {
      const newTotal = stats.totalResolved + 1;
      const newAverage = Math.floor(
        (stats.averageResolutionTime * stats.totalResolved + resolutionTime) /
          newTotal,
      );

      await this.prisma.operatorStats.update({
        where: { userId: operatorId },
        data: {
          totalResolved: newTotal,
          averageResolutionTime: newAverage,
        },
      });
    }
  }

  private async updateOperatorRating(operatorId: string, rating: number) {
    const stats = await this.prisma.operatorStats.findUnique({
      where: { userId: operatorId },
    });

    if (stats) {
      const newTotal = stats.totalRatings + 1;
      const newAverage =
        (stats.averageRating * stats.totalRatings + rating) / newTotal;

      await this.prisma.operatorStats.update({
        where: { userId: operatorId },
        data: {
          totalRatings: newTotal,
          averageRating: newAverage,
        },
      });
    }
  }

  private async autoAssignTicket(ticketId: string): Promise<void> {
    // Находим наименее загруженного оператора
    const operators = await this.prisma.user.findMany({
      where: {
        role: { in: [UserRole.OPERATOR, UserRole.SPECIALIST] },
        isActive: true,
      },
      include: {
        _count: {
          select: {
            operatorTickets: {
              where: {
                status: { in: [TicketStatus.NEW, TicketStatus.IN_PROGRESS] },
              },
            },
          },
        },
      },
      orderBy: {
        operatorTickets: {
          _count: 'asc',
        },
      },
      take: 1,
    });

    if (operators.length > 0) {
      await this.assignTicket(ticketId, operators[0].id);
    }
  }
}
