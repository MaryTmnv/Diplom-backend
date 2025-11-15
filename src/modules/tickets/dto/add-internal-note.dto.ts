import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class AddInternalNoteDto {
  @ApiProperty({
    example: 'Клиент ранее обращался с похожей проблемой',
    description: 'Текст внутренней заметки (видна только операторам)',
    minLength: 5,
  })
  @IsString()
  @MinLength(5, { message: 'Заметка должна содержать минимум 5 символов' })
  content: string;
}
