import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TicketPriority } from '@prisma/client';

export class UpdateTicketPriorityDto {
  @ApiProperty({
    enum: TicketPriority,
    example: TicketPriority.HIGH,
    description: 'Новый приоритет заявки',
  })
  @IsEnum(TicketPriority, { message: 'Некорректный приоритет' })
  priority: TicketPriority;

  @ApiProperty({
    example: 'Повышен приоритет из-за VIP клиента',
    description: 'Причина изменения приоритета',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
