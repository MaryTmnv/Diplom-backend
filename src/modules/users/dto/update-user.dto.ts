// src/modules/users/dto/update-user.dto.ts
import { ApiProperty, PartialType, OmitType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['password', 'email'] as const),
) {
  @ApiProperty({
    example: 'Иван',
    description: 'Имя пользователя',
    required: false,
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({
    example: 'Иванов',
    description: 'Фамилия пользователя',
    required: false,
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({
    example: '+79991234567',
    description: 'Номер телефона',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    example: 'https://example.com/avatar.jpg',
    description: 'URL аватара',
    required: false,
  })
  @IsOptional()
  @IsString()
  avatar?: string;
}
