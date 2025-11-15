// src/modules/tickets/entities/ticket.entity.ts
import { ApiProperty } from '@nestjs/swagger';
import { TicketStatus, TicketPriority, TicketCategory } from '@prisma/client';

export class TicketEntity {
  @ApiProperty({ example: 'uuid', description: 'ID заявки' })
  id: string;

  @ApiProperty({ example: 'TKT-000001', description: 'Номер заявки' })
  number: string;

  @ApiProperty({ example: 'Проблема с картой', description: 'Заголовок заявки' })
  title: string;

  @ApiProperty({ example: 'Не могу войти в приложение', description: 'Описание проблемы' })
  description: string;

  @ApiProperty({ enum: TicketStatus, description: 'Статус заявки' })
  status: TicketStatus;

  @ApiProperty({ enum: TicketPriority, description: 'Приоритет заявки' })
  priority: TicketPriority;

  @ApiProperty({ enum: TicketCategory, description: 'Категория заявки' })
  category: TicketCategory;

  @ApiProperty({ description: 'ID клиента' })
  clientId: string;

  @ApiProperty({ description: 'Информация о клиенте', required: false })
  client?: any;

  @ApiProperty({ description: 'ID оператора', required: false })
  operatorId?: string;

  @ApiProperty({ description: 'Информация об операторе', required: false })
  operator?: any;

  @ApiProperty({ description: 'Дата создания' })
  createdAt: Date;

  @ApiProperty({ description: 'Дата обновления' })
  updatedAt: Date;

  @ApiProperty({ description: 'Дата назначения', required: false })
  assignedAt?: Date;

  @ApiProperty({ description: 'Дата решения', required: false })
  resolvedAt?: Date;

  @ApiProperty({ description: 'Дата закрытия', required: false })
  closedAt?: Date;

  @ApiProperty({ description: 'Контекстные данные', required: false })
  contextData?: any;

  @ApiProperty({ description: 'Количество непрочитанных сообщений', required: false })
  unreadCount?: number;
}
