import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class AssignTicketDto {
  @ApiProperty({
    example: 'operator-user-id',
    description: 'ID оператора (если не указан - назначается на текущего пользователя)',
    required: false,
  })
  @IsOptional()
  @IsString()
  operatorId?: string;
}
