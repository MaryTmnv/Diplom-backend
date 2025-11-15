import { ApiProperty } from '@nestjs/swagger';

export class UploadFileResponseDto {
  @ApiProperty({ example: 'uuid', description: 'ID загруженного файла' })
  id: string;

  @ApiProperty({ example: 'document.pdf', description: 'Имя файла' })
  fileName: string;

  @ApiProperty({ example: 1024000, description: 'Размер файла в байтах' })
  fileSize: number;

  @ApiProperty({ example: 'application/pdf', description: 'MIME тип' })
  mimeType: string;

  @ApiProperty({ example: 'http://localhost:3000/api/files/uuid', description: 'URL файла' })
  url: string;

  @ApiProperty({ description: 'Дата загрузки' })
  createdAt: Date;
}
