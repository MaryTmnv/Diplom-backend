import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateUserStatusDto {
  @ApiProperty({
    example: true,
    description: 'Статус активности пользователя',
  })
  @IsBoolean()
  isActive: boolean;
}
