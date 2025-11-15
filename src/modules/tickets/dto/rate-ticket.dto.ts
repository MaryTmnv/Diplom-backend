import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min, Max, IsOptional, IsString, IsBoolean } from 'class-validator';

export class RateTicketDto {
  @ApiProperty({
    example: 5,
    description: 'Оценка от 1 до 5 звёзд',
    minimum: 1,
    maximum: 5,
  })
  @IsInt()
  @Min(1, { message: 'Минимальная оценка - 1' })
  @Max(5, { message: 'Максимальная оценка - 5' })
  rating: number;

  @ApiProperty({
    example: 'Отличная работа, быстро решили проблему!',
    description: 'Текстовый отзыв',
    required: false,
  })
  @IsOptional()
  @IsString()
  feedback?: string;

  @ApiProperty({
    example: true,
    description: 'Понравилась скорость решения',
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  likedSpeed?: boolean;

  @ApiProperty({
    example: true,
    description: 'Понравилась ясность объяснений',
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  likedClarity?: boolean;

  @ApiProperty({
    example: true,
    description: 'Понравилась вежливость',
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  likedPoliteness?: boolean;

  @ApiProperty({
    example: true,
    description: 'Понравилась полнота решения',
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  likedCompleteness?: boolean;
}
