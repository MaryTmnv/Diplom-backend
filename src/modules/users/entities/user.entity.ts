import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class UserEntity {
  @ApiProperty({ example: 'uuid', description: 'ID пользователя' })
  id: string;

  @ApiProperty({ example: 'user@example.com', description: 'Email' })
  email: string;

  @ApiProperty({ example: 'Иван', description: 'Имя' })
  firstName: string;

  @ApiProperty({ example: 'Иванов', description: 'Фамилия' })
  lastName: string;

  @ApiProperty({ example: '+79991234567', description: 'Телефон', required: false })
  phone?: string;

  @ApiProperty({ example: 'https://example.com/avatar.jpg', description: 'Аватар', required: false })
  avatar?: string;

  @ApiProperty({ enum: UserRole, description: 'Роль пользователя' })
  role: UserRole;

  @ApiProperty({ example: true, description: 'Активен ли пользователь' })
  isActive: boolean;

  @ApiProperty({ description: 'Дата создания' })
  createdAt: Date;

  @ApiProperty({ description: 'Дата обновления' })
  updatedAt: Date;

  @ApiProperty({ description: 'Профиль клиента', required: false })
  clientProfile?: any;

  @ApiProperty({ description: 'Статистика оператора', required: false })
  operatorStats?: any;
}
