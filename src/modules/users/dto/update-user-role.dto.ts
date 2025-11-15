import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { UserRole } from '@prisma/client';

export class UpdateUserRoleDto {
  @ApiProperty({
    enum: UserRole,
    example: UserRole.OPERATOR,
    description: 'Новая роль пользователя',
  })
  @IsEnum(UserRole, { message: 'Некорректная роль' })
  role: UserRole;
}
