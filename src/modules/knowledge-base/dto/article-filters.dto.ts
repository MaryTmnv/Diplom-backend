import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ArticleCategory } from '@prisma/client';

export class ArticleFiltersDto {
  @ApiProperty({
    enum: ArticleCategory,
    description: 'Фильтр по категории',
    required: false,
  })
  @IsOptional()
  @IsEnum(ArticleCategory)
  category?: ArticleCategory;

  @ApiProperty({
    example: 'блокировка карты',
    description: 'Поиск по заголовку, описанию или содержимому',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    example: 'popular',
    enum: ['popular', 'recent', 'helpful'],
    description: 'Сортировка: popular (по просмотрам), recent (новые), helpful (полезные)',
    default: 'popular',
    required: false,
  })
  @IsOptional()
  @IsString()
  sortBy?: 'popular' | 'recent' | 'helpful' = 'popular';

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
