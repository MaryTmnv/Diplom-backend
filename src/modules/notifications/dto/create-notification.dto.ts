import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional } from 'class-validator';
import { NotificationType } from '@prisma/client';

export class CreateNotificationDto {
  @ApiProperty({
    example: 'user-id',
    description: 'ID пользователя-получателя',
  })
  @IsString()
  userId: string;

  @ApiProperty({
    enum: NotificationType,
    example: NotificationType.TICKET_CREATED,
    description: 'Тип уведомления',
  })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({
    example: 'Новая заявка',
    description: 'Заголовок уведомления',
  })
  @IsString()
  title: string;

  @ApiProperty({
    example: 'Создана новая заявка TKT-000001',
    description: 'Текст уведомления',
  })
  @IsString()
  message: string;

  @ApiProperty({
    example: 'ticket-id',
    description: 'ID связанной сущности',
    required: false,
  })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiProperty({
    example: 'ticket',
    description: 'Тип сущности (ticket, message)',
    required: false,
  })
  @IsOptional()
  @IsString()
  entityType?: string;
}
