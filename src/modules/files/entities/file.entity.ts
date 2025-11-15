import { ApiProperty } from '@nestjs/swagger';

export class FileEntity {
  @ApiProperty({ example: 'uuid', description: 'ID файла' })
  id: string;

  @ApiProperty({ example: 'document.pdf', description: 'Имя файла' })
  fileName: string;

  @ApiProperty({ example: 1024000, description: 'Размер файла в байтах' })
  fileSize: number;

  @ApiProperty({ example: 'application/pdf', description: 'MIME тип файла' })
  mimeType: string;

  @ApiProperty({ example: 'uploads/uuid-document.pdf', description: 'Путь к файлу' })
  path: string;

  @ApiProperty({ example: 'http://localhost:3000/api/files/uuid', description: 'URL для скачивания' })
  url: string;

  @ApiProperty({ description: 'Дата загрузки' })
  createdAt: Date;
}
