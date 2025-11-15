import { ApiProperty } from '@nestjs/swagger';

export class MessageEntity {
  @ApiProperty({ example: 'uuid', description: 'ID сообщения' })
  id: string;

  @ApiProperty({ example: 'ticket-id', description: 'ID заявки' })
  ticketId: string;

  @ApiProperty({ example: 'user-id', description: 'ID автора' })
  authorId: string;

  @ApiProperty({ description: 'Информация об авторе' })
  author: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    role: string;
  };

  @ApiProperty({ example: 'Здравствуйте! Помогите решить проблему', description: 'Текст сообщения' })
  content: string;

  @ApiProperty({ example: false, description: 'Внутреннее сообщение (только для операторов)' })
  isInternal: boolean;

  @ApiProperty({ description: 'Дата создания' })
  createdAt: Date;

  @ApiProperty({ description: 'Дата прочтения', required: false })
  readAt?: Date;

  @ApiProperty({ description: 'Вложения', required: false })
  attachments?: any[];
}
