// src/modules/users/dto/change-password.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    example: 'OldPassword123',
    description: 'Текущий пароль',
  })
  @IsString()
  currentPassword: string;

  @ApiProperty({
    example: 'NewPassword123',
    description: 'Новый пароль',
  })
  @IsString()
  @MinLength(8, { message: 'Пароль должен содержать минимум 8 символов' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Пароль должен содержать заглавные и строчные буквы, цифры',
  })
  newPassword: string;
}
