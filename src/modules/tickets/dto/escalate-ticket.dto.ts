import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, IsBoolean, IsOptional } from 'class-validator';

export class EscalateTicketDto {
  @ApiProperty({
    example: 'specialist-user-id',
    description: 'ID специалиста, которому передаётся заявка',
  })
  @IsString()
  specialistId: string;

  @ApiProperty({
    example: 'Требуется экспертиза по безопасности',
    description: 'Причина эскалации',
    minLength: 10,
  })
  @IsString()
  @MinLength(10, { message: 'Причина должна содержать минимум 10 символов' })
  reason: string;

  @ApiProperty({
    example: true,
    description: 'Уведомить ли клиента об эскалации',
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  notifyClient?: boolean;
}
