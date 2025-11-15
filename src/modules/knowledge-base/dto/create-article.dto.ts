import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  MinLength,
  IsEnum,
  IsInt,
  Min,
  IsBoolean,
  IsOptional,
  IsArray,
} from 'class-validator';
import { ArticleCategory } from '@prisma/client';

export class CreateArticleDto {
  @ApiProperty({
    example: 'Как заблокировать карту',
    description: 'Заголовок статьи',
    minLength: 5,
  })
  @IsString()
  @MinLength(5, { message: 'Заголовок должен содержать минимум 5 символов' })
  title: string;

  @ApiProperty({
    example: 'how-to-block-card',
    description: 'URL slug (уникальный)',
    minLength: 3,
  })
  @IsString()
  @MinLength(3, { message: 'Slug должен содержать минимум 3 символа' })
  slug: string;

  @ApiProperty({
    example: 'Пошаговая инструкция по блокировке карты через мобильное приложение',
    description: 'Краткое описание статьи',
    minLength: 10,
  })
  @IsString()
  @MinLength(10, { message: 'Описание должно содержать минимум 10 символов' })
  excerpt: string;

  @ApiProperty({
    example: '# Как заблокировать карту\n\n## Шаг 1\nОткройте приложение...',
    description: 'Полный текст статьи в формате Markdown',
    minLength: 50,
  })
  @IsString()
  @MinLength(50, { message: 'Содержимое должно содержать минимум 50 символов' })
  content: string;

  @ApiProperty({
    enum: ArticleCategory,
    example: ArticleCategory.CARDS,
    description: 'Категория статьи',
  })
  @IsEnum(ArticleCategory, { message: 'Некорректная категория' })
  category: ArticleCategory;

  @ApiProperty({
    example: 3,
    description: 'Время чтения в минутах',
    minimum: 1,
  })
  @IsInt()
  @Min(1, { message: 'Время чтения должно быть минимум 1 минута' })
  readingTime: number;

  @ApiProperty({
    example: true,
    description: 'Опубликовать ли статью сразу',
    default: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean = true;

  @ApiProperty({
    example: ['article-id-1', 'article-id-2'],
    description: 'ID связанных статей',
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedArticleIds?: string[];
}
