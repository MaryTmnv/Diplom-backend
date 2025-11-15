import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { TicketCategory } from '@prisma/client';

export class CreateTemplateDto {
  @ApiProperty({
    example: 'Приветствие клиента',
    description: 'Название шаблона',
    minLength: 3,
  })
  @IsString()
  @MinLength(3, { message: 'Название должно содержать минимум 3 символа' })
  title: string;

  @ApiProperty({
    example: 'Здравствуйте, {name}! Уже смотрю вашу проблему 👀\n\nПодскажите, вы пробовали {action}?',
    description: 'Текст шаблона. Используйте {переменная} для вставки динамических данных',
    minLength: 10,
  })
  @IsString()
  @MinLength(10, { message: 'Содержимое должно содержать минимум 10 символов' })
  content: string;

  @ApiProperty({
    enum: TicketCategory,
    example: TicketCategory.MOBILE_APP,
    description: 'Категория шаблона',
  })
  @IsEnum(TicketCategory, { message: 'Некорректная категория' })
  category: TicketCategory;

  @ApiProperty({
    example: ['name', 'action', 'ticketNumber'],
    description: 'Список переменных в шаблоне',
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @ApiProperty({
    example: true,
    description: 'Активен ли шаблон',
    default: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
