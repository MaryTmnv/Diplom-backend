import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsDateString } from 'class-validator';

export class AnalyticsQueryDto {
  @ApiProperty({
    enum: ['today', 'week', 'month', 'quarter', 'year', 'custom'],
    example: 'week',
    description: 'Период для анализа',
    default: 'week',
    required: false,
  })
  @IsOptional()
  @IsEnum(['today', 'week', 'month', 'quarter', 'year', 'custom'])
  period?: string = 'week';

  @ApiProperty({
    example: '2025-01-01',
    description: 'Дата начала (для custom периода)',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiProperty({
    example: '2025-12-31',
    description: 'Дата окончания (для custom периода)',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
