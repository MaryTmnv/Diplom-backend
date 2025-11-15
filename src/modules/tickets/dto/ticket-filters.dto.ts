import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsArray,
  IsEnum,
  IsString,
  IsDateString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TicketStatus, TicketPriority, TicketCategory } from '@prisma/client';

export class TicketFiltersDto {
  @ApiProperty({
    enum: TicketStatus,
    isArray: true,
    description: 'Фильтр по статусам',
    required: false,
    example: [TicketStatus.NEW, TicketStatus.IN_PROGRESS],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(TicketStatus, { each: true })
  status?: TicketStatus[];

  @ApiProperty({
    enum: TicketPriority,
    isArray: true,
    description: 'Фильтр по приоритетам',
    required: false,
    example: [TicketPriority.HIGH, TicketPriority.CRITICAL],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(TicketPriority, { each: true })
  priority?: TicketPriority[];

  @ApiProperty({
    enum: TicketCategory,
    isArray: true,
    description: 'Фильтр по категориям',
    required: false,
    example: [TicketCategory.MOBILE_APP],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(TicketCategory, { each: true })
  category?: TicketCategory[];

  @ApiProperty({
    example: 'проблема с входом',
    description: 'Поиск по заголовку, описанию или номеру заявки',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    example: '2024-01-01',
    description: 'Дата начала периода',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiProperty({
    example: '2024-12-31',
    description: 'Дата окончания периода',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

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
