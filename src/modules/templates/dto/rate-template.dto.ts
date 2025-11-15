import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min, Max } from 'class-validator';

export class RateTemplateDto {
  @ApiProperty({
    example: 5,
    description: 'Оценка шаблона от 1 до 5',
    minimum: 1,
    maximum: 5,
  })
  @IsInt()
  @Min(1, { message: 'Минимальная оценка - 1' })
  @Max(5, { message: 'Максимальная оценка - 5' })
  rating: number;
}
