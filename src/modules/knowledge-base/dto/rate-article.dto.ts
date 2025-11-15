import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class RateArticleDto {
  @ApiProperty({
    example: true,
    description: 'Полезна ли статья (true - полезна, false - не полезна)',
  })
  @IsBoolean()
  helpful: boolean;
}
