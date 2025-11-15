import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TicketStatus } from '@prisma/client';

export class UpdateTicketStatusDto {
  @ApiProperty({
    enum: TicketStatus,
    example: TicketStatus.IN_PROGRESS,
    description: 'Новый статус заявки',
  })
  @IsEnum(TicketStatus, { message: 'Некорректный статус' })
  status: TicketStatus;

  @ApiProperty({
    example: 'Начал работу над заявкой',
    description: 'Комментарий к изменению статуса',
    required: false,
  })
  @IsOptional()
  @IsString()
  comment?: string;
}
