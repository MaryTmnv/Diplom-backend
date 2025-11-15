// src/modules/users/dto/user-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { UserEntity } from '../entities/user.entity';

export class UserResponseDto {
  @ApiProperty({ type: [UserEntity], description: 'Список пользователей' })
  data: UserEntity[];

  @ApiProperty({
    description: 'Метаданные пагинации',
    example: {
      total: 100,
      page: 1,
      limit: 20,
      totalPages: 5,
    },
  })
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
