import { ApiProperty } from '@nestjs/swagger';
import { ArticleCategory } from '@prisma/client';

export class ArticleEntity {
  @ApiProperty({ example: 'uuid', description: 'ID статьи' })
  id: string;

  @ApiProperty({ example: 'Как заблокировать карту', description: 'Заголовок статьи' })
  title: string;

  @ApiProperty({ example: 'how-to-block-card', description: 'URL slug статьи' })
  slug: string;

  @ApiProperty({ 
    example: 'Пошаговая инструкция по блокировке карты через мобильное приложение',
    description: 'Краткое описание' 
  })
  excerpt: string;

  @ApiProperty({ 
    example: '# Как заблокировать карту\n\nШаг 1: Откройте приложение...',
    description: 'Полный текст статьи (Markdown)' 
  })
  content: string;

  @ApiProperty({ enum: ArticleCategory, description: 'Категория статьи' })
  category: ArticleCategory;

  @ApiProperty({ example: 1234, description: 'Количество просмотров' })
  views: number;

  @ApiProperty({ example: 100, description: 'Количество положительных оценок' })
  helpfulCount: number;

  @ApiProperty({ example: 10, description: 'Количество отрицательных оценок' })
  notHelpfulCount: number;

  @ApiProperty({ example: 85, description: 'Процент полезности' })
  helpfulPercentage?: number;

  @ApiProperty({ example: 3, description: 'Время чтения в минутах' })
  readingTime: number;

  @ApiProperty({ example: true, description: 'Опубликована ли статья' })
  isPublished: boolean;

  @ApiProperty({ description: 'Дата создания' })
  createdAt: Date;

  @ApiProperty({ description: 'Дата обновления' })
  updatedAt: Date;

  @ApiProperty({ description: 'Связанные статьи', required: false })
  relatedArticles?: ArticleEntity[];
}
