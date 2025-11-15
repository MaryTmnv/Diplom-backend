import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import {
  formatFileSize,
  getFileExtension,
  isImage,
} from './utils/file-upload.utils';

@Injectable()
export class FilesService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async uploadFile(file: Express.Multer.File, userId?: string) {
    if (!file) {
      throw new BadRequestException('Файл не предоставлен');
    }

    try {
      // Создаём запись в БД
      const attachment = await this.prisma.attachment.create({
        data: {
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          path: file.path,
          url: `/api/files/${file.filename}`,
        },
      });

      return {
        id: attachment.id,
        fileName: attachment.fileName,
        fileSize: attachment.fileSize,
        fileSizeFormatted: formatFileSize(attachment.fileSize),
        mimeType: attachment.mimeType,
        extension: getFileExtension(attachment.fileName),
        isImage: isImage(attachment.mimeType),
        url: attachment.url,
        createdAt: attachment.createdAt,
      };
    } catch (error) {
      // Если ошибка при сохранении в БД - удаляем файл
      if (existsSync(file.path)) {
        await unlink(file.path);
      }
      throw new InternalServerErrorException('Ошибка при загрузке файла');
    }
  }

  async uploadMultiple(files: Express.Multer.File[], userId?: string) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Файлы не предоставлены');
    }

    const uploadedFiles = [];

    for (const file of files) {
      try {
        const uploaded = await this.uploadFile(file, userId);
        uploadedFiles.push(uploaded);
      } catch (error) {
        // Если один файл не загрузился - продолжаем с остальными
        console.error(`Ошибка загрузки файла ${file.originalname}:`, error);
      }
    }

    return uploadedFiles;
  }

  async findOne(id: string) {
    const file = await this.prisma.attachment.findUnique({
      where: { id },
    });

    if (!file) {
      throw new NotFoundException('Файл не найден');
    }

    return file;
  }

  async getFilePath(id: string): Promise<string> {
    const file = await this.findOne(id);

    if (!existsSync(file.path)) {
      throw new NotFoundException('Файл не найден на сервере');
    }

    return file.path;
  }

  async delete(id: string, userId: string, userRole: string) {
    const file = await this.prisma.attachment.findUnique({
      where: { id },
      include: {
        ticket: true,
        message: {
          include: {
            ticket: true,
          },
        },
      },
    });

    if (!file) {
      throw new NotFoundException('Файл не найден');
    }

    // Проверка прав доступа
    // Клиент может удалить только свои файлы из своих заявок
    if (userRole === 'CLIENT') {
      const ticketId = file.ticketId || file.message?.ticketId;
      if (ticketId) {
        const ticket = await this.prisma.ticket.findUnique({
          where: { id: ticketId },
        });

        if (!ticket || ticket.clientId !== userId) {
          throw new BadRequestException('Нет прав на удаление этого файла');
        }
      }
    }

    // Удаляем файл из БД
    await this.prisma.attachment.delete({
      where: { id },
    });

    // Удаляем физический файл
    try {
      if (existsSync(file.path)) {
        await unlink(file.path);
      }
    } catch (error) {
      console.error('Ошибка при удалении файла:', error);
    }

    return { message: 'Файл успешно удалён' };
  }

  async getFilesByTicket(ticketId: string) {
    return this.prisma.attachment.findMany({
      where: {
        OR: [
          { ticketId },
          {
            message: {
              ticketId,
            },
          },
        ],
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getFileInfo(id: string) {
    const file = await this.findOne(id);

    return {
      id: file.id,
      fileName: file.fileName,
      fileSize: file.fileSize,
      fileSizeFormatted: formatFileSize(file.fileSize),
      mimeType: file.mimeType,
      extension: getFileExtension(file.fileName),
      isImage: isImage(file.mimeType),
      url: file.url,
      createdAt: file.createdAt,
    };
  }
}
