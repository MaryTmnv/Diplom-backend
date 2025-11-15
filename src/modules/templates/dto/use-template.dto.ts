import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsOptional } from 'class-validator';

export class UseTemplateDto {
  @ApiProperty({
    example: {
      name: 'Иван Иванов',
      ticketNumber: 'TKT-000001',
      action: 'перезагрузить приложение',
      date: '15.11.2025',
    },
    description: 'Значения переменных для подстановки в шаблон',
    required: false,
  })
  @IsOptional()
  @IsObject()
  variables?: Record<string, string>;
}
