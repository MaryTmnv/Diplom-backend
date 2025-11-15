// src/modules/auth/dto/login.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email пользователя',
  })
  @IsEmail({}, { message: 'Некорректный email адрес' })
  email: string;

  @ApiProperty({
    example: 'Password123',
    description: 'Пароль',
  })
  @IsString()
  password: string;
}
