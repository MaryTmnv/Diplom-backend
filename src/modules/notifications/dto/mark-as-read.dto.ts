import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsOptional } from 'class-validator';

export class MarkNotificationsAsReadDto {
  @ApiProperty({
    example: ['notification-id-1', 'notification-id-2'],
    description: 'ID уведомлений для отметки как прочитанные',
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  notificationIds?: string[];
}
