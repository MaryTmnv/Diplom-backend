import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  Res,
  StreamableFile,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { createReadStream } from 'fs';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { multerConfig, multerMultipleConfig } from './utils/multer.config';
import { Prisma, UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { PrismaService } from '../database/prisma.service';

@ApiTags('Files')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService, private prisma: PrismaService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Загрузить один файл' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Файл успешно загружен' })
  @ApiResponse({ status: 400, description: 'Некорректный файл' })
  @UseInterceptors(FileInterceptor('file', multerConfig))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    if (!file) {
      throw new BadRequestException('Файл не предоставлен');
    }

    return this.filesService.uploadFile(file, user.id);
  }

  @Post('upload-multiple')
  @ApiOperation({ summary: 'Загрузить несколько файлов (максимум 5)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Файлы успешно загружены' })
  @ApiResponse({ status: 400, description: 'Некорректные файлы' })
  @UseInterceptors(FilesInterceptor('files', 5, multerMultipleConfig))
  async uploadMultiple(
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: any,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Файлы не предоставлены');
    }

    return this.filesService.uploadMultiple(files, user.id);
  }

  @Get(':filename')
  @ApiOperation({ summary: 'Скачать файл' })
  @ApiResponse({ status: 200, description: 'Файл' })
  @ApiResponse({ status: 404, description: 'Файл не найден' })
  async downloadFile(
    @Param('filename') filename: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Ищем файл по имени в пути
    const file = await this.prisma.attachment.findFirst({
      where: {
        path: {
          contains: filename,
        },
      },
    });

    if (!file) {
      throw new NotFoundException('Файл не найден');
    }

    const filePath = await this.filesService.getFilePath(file.id);
    const fileStream = createReadStream(filePath);

    // Устанавливаем заголовки
    res.set({
      'Content-Type': file.mimeType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(file.fileName)}"`,
    });

    return new StreamableFile(fileStream);
  }

  @Get('info/:id')
  @ApiOperation({ summary: 'Получить информацию о файле' })
  @ApiResponse({ status: 200, description: 'Информация о файле' })
  @ApiResponse({ status: 404, description: 'Файл не найден' })
  async getFileInfo(@Param('id') id: string) {
    return this.filesService.getFileInfo(id);
  }

  @Get('ticket/:ticketId')
  @ApiOperation({ summary: 'Получить все файлы заявки' })
  @ApiResponse({ status: 200, description: 'Список файлов' })
  async getFilesByTicket(@Param('ticketId') ticketId: string) {
    return this.filesService.getFilesByTicket(ticketId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить файл' })
  @ApiResponse({ status: 200, description: 'Файл успешно удалён' })
  @ApiResponse({ status: 404, description: 'Файл не найден' })
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.filesService.delete(id, user.id, user.role);
  }
}
