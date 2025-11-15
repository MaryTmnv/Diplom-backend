import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsBoolean, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { TicketCategory } from '@prisma/client';

export class TemplateFiltersDto {
  @ApiProperty({
    enum: TicketCategory,
    description: 'Фильтр по категории',
    required: false,
  })
  @IsOptional()
  @IsEnum(TicketCategory)
  category?: TicketCategory;

  @ApiProperty({
    example: true,
    description: 'Показать только активные шаблоны',
    default: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  activeOnly?: boolean = true;

  @ApiProperty({
    example: 'приветствие',
    description: 'Поиск по названию или содержимому',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    example: 'popular',
    enum: ['popular', 'recent', 'rated'],
    description: 'Сортировка: popular (по использованию), recent (новые), rated (по оценке)',
    default: 'popular',
    required: false,
  })
  @IsOptional()
  @IsString()
  sortBy?: 'popular' | 'recent' | 'rated' = 'popular';

  @ApiProperty({
    example: 1,
    description: 'Номер страницы',
    default: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({
    example: 20,
    description: 'Количество элементов на странице',
    default: 20,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;
}
