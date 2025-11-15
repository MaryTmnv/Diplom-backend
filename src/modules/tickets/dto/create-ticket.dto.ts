import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  MinLength,
  MaxLength,
  IsEnum,
  IsOptional,
  IsArray,
  IsObject,
} from 'class-validator';
import { TicketCategory } from '@prisma/client';

export class CreateTicketDto {
  @ApiProperty({
    example: 'Не могу войти в мобильное приложение',
    description: 'Заголовок заявки',
    minLength: 5,
    maxLength: 200,
  })
  @IsString()
  @MinLength(5, { message: 'Заголовок должен содержать минимум 5 символов' })
  @MaxLength(200, { message: 'Заголовок не должен превышать 200 символов' })
  title: string;

  @ApiProperty({
    example: 'При попытке входа появляется ошибка "Неверный пароль", хотя пароль точно правильный',
    description: 'Подробное описание проблемы',
    minLength: 10,
  })
  @IsString()
  @MinLength(10, { message: 'Описание должно содержать минимум 10 символов' })
  description: string;

  @ApiProperty({
    enum: TicketCategory,
    example: TicketCategory.MOBILE_APP,
    description: 'Категория заявки',
  })
  @IsEnum(TicketCategory, { message: 'Некорректная категория' })
  category: TicketCategory;

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
    example: {
      deviceInfo: 'iPhone 13, iOS 17.2',
      lastAction: 'Попытка входа',
      errorCode: 'AUTH_001',
    },
    description: 'Дополнительная контекстная информация',
    required: false,
  })
  @IsOptional()
  @IsObject()
  contextData?: Record<string, any>;
}
