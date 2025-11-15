import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';

export class NotificationEntity {
  @ApiProperty({ example: 'uuid', description: 'ID уведомления' })
  id: string;

  @ApiProperty({ example: 'user-id', description: 'ID пользователя' })
  userId: string;

  @ApiProperty({ 
    enum: NotificationType, 
    example: NotificationType.TICKET_CREATED,
    description: 'Тип уведомления' 
  })
  type: NotificationType;

  @ApiProperty({ example: 'Новая заявка', description: 'Заголовок уведомления' })
  title: string;

  @ApiProperty({ 
    example: 'Создана новая заявка TKT-000001', 
    description: 'Текст уведомления' 
  })
  message: string;

  @ApiProperty({ example: 'ticket-id', description: 'ID связанной сущности', required: false })
  entityId?: string;

  @ApiProperty({ example: 'ticket', description: 'Тип сущности', required: false })
  entityType?: string;

  @ApiProperty({ example: false, description: 'Прочитано ли уведомление' })
  isRead: boolean;

  @ApiProperty({ description: 'Дата прочтения', required: false })
  readAt?: Date;

  @ApiProperty({ description: 'Дата создания' })
  createdAt: Date;
}
