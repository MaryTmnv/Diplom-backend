import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, IsOptional, IsArray, IsBoolean } from 'class-validator';

export class CreateMessageDto {
  @ApiProperty({
    example: 'Здравствуйте! У меня проблема с входом в приложение',
    description: 'Текст сообщения',
    minLength: 1,
  })
  @IsString()
  @MinLength(1, { message: 'Сообщение не может быть пустым' })
  content: string;

  @ApiProperty({
    example: ['file-id-1', 'file-id-2'],
    description: 'ID загруженных файлов',
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentIds?: string[];

  @ApiProperty({
    example: false,
    description: 'Внутреннее сообщение (только для операторов)',
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}
