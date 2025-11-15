// src/modules/auth/dto/reset-password.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, Matches } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Токен для сброса пароля',
  })
  @IsString()
  token: string;

  @ApiProperty({
    example: 'NewPassword123',
    description: 'Новый пароль',
  })
  @IsString()
  @MinLength(8, { message: 'Пароль должен содержать минимум 8 символов' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Пароль должен содержать заглавные и строчные буквы, цифры',
  })
  password: string;
}
