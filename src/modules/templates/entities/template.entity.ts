import { ApiProperty } from '@nestjs/swagger';
import { TicketCategory } from '@prisma/client';

export class TemplateEntity {
  @ApiProperty({ example: 'uuid', description: 'ID шаблона' })
  id: string;

  @ApiProperty({ 
    example: 'Приветствие клиента', 
    description: 'Название шаблона' 
  })
  title: string;

  @ApiProperty({ 
    example: 'Здравствуйте, {name}! Уже смотрю вашу проблему 👀',
    description: 'Текст шаблона с переменными' 
  })
  content: string;

  @ApiProperty({ 
    enum: TicketCategory,
    example: TicketCategory.CARDS,
    description: 'Категория шаблона' 
  })
  category: TicketCategory;

  @ApiProperty({ 
    example: 150,
    description: 'Количество использований' 
  })
  usageCount: number;

  @ApiProperty({ 
    example: 4.5,
    description: 'Средняя оценка шаблона' 
  })
  rating: number;

  @ApiProperty({ 
    example: ['name', 'ticketNumber', 'date'],
    description: 'Список доступных переменных',
    type: [String],
  })
  variables: string[];

  @ApiProperty({ 
    example: true,
    description: 'Активен ли шаблон' 
  })
  isActive: boolean;

  @ApiProperty({ description: 'Дата создания' })
  createdAt: Date;

  @ApiProperty({ description: 'Дата обновления' })
  updatedAt: Date;
}
