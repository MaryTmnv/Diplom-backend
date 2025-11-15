import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  Matches,
  IsOptional,
  IsPhoneNumber,
  IsEnum,
} from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email пользователя',
  })
  @IsEmail({}, { message: 'Некорректный email адрес' })
  email: string;

  @ApiProperty({
    example: 'Password123',
    description: 'Пароль (минимум 8 символов)',
  })
  @IsString()
  @MinLength(8, { message: 'Пароль должен содержать минимум 8 символов' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Пароль должен содержать заглавные и строчные буквы, цифры',
  })
  password: string;

  @ApiProperty({
    example: 'Иван',
    description: 'Имя пользователя',
  })
  @IsString()
  @MinLength(2, { message: 'Имя должно содержать минимум 2 символа' })
  firstName: string;

  @ApiProperty({
    example: 'Иванов',
    description: 'Фамилия пользователя',
  })
  @IsString()
  @MinLength(2, { message: 'Фамилия должна содержать минимум 2 символа' })
  lastName: string;

  @ApiProperty({
    example: '+79991234567',
    description: 'Номер телефона',
    required: false,
  })
  @IsOptional()
  @IsPhoneNumber('RU', { message: 'Некорректный номер телефона' })
  phone?: string;

  @ApiProperty({
    enum: UserRole,
    example: UserRole.CLIENT,
    description: 'Роль пользователя',
    default: UserRole.CLIENT,
  })
  @IsEnum(UserRole, { message: 'Некорректная роль' })
  role: UserRole;
}
