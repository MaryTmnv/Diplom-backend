// src/modules/files/utils/file-upload.utils.ts
import { BadRequestException } from '@nestjs/common';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

// Разрешённые MIME типы
export const ALLOWED_MIME_TYPES = [
  // Изображения
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  
  // Документы
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  
  // Текстовые файлы
  'text/plain',
  'text/csv',
  
  // Архивы
  'application/zip',
  'application/x-rar-compressed',
];

// Максимальный размер файла (10MB)
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Генерация уникального имени файла
export const generateFileName = (originalName: string): string => {
  const fileExtension = extname(originalName);
  const fileName = `${uuidv4()}${fileExtension}`;
  return fileName;
};

// Валидация файла
export const validateFile = (file: Express.Multer.File) => {
  // Проверка размера
  if (file.size > MAX_FILE_SIZE) {
    throw new BadRequestException(
      `Файл слишком большой. Максимальный размер: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    );
  }

  // Проверка типа
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new BadRequestException(
      `Недопустимый тип файла: ${file.mimetype}. Разрешённые типы: изображения, PDF, документы Word/Excel`,
    );
  }

  return true;
};

// Форматирование размера файла
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

// Получение расширения файла
export const getFileExtension = (filename: string): string => {
  return extname(filename).toLowerCase().replace('.', '');
};

// Проверка, является ли файл изображением
export const isImage = (mimeType: string): boolean => {
  return mimeType.startsWith('image/');
};
