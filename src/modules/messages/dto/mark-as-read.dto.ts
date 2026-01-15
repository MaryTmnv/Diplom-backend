import { IsArray, IsString, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MarkAsReadDto {
  @ApiProperty({
    description: 'Массив ID сообщений для отметки как прочитанные',
    type: [String],
    example: ['msg-uuid-1', 'msg-uuid-2', 'msg-uuid-3'],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Необходимо указать хотя бы одно сообщение' })
  @IsString({ each: true })
  messageIds: string[];
}
