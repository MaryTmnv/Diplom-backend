import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class MarkAsReadDto {
  @ApiProperty({
    example: ['message-id-1', 'message-id-2'],
    description: 'ID сообщений для отметки как прочитанные',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  messageIds: string[];
}
