import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { AnalyticsQueryDto } from './analytics-query.dto';

export class ExportReportDto extends AnalyticsQueryDto {
  @ApiProperty({
    enum: ['json', 'csv'],
    example: 'json',
    description: 'Формат экспорта',
    default: 'json',
  })
  @IsEnum(['json', 'csv'])
  format: string = 'json';
}
