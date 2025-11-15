import { diskStorage } from 'multer';
import { BadRequestException } from '@nestjs/common';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { generateFileName, validateFile } from './file-upload.utils';

// Конфигурация Multer
export const multerConfig = {
  storage: diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = process.env.UPLOAD_DIR || './uploads';

      // Создаём папку если её нет
      if (!existsSync(uploadPath)) {
        mkdirSync(uploadPath, { recursive: true });
      }

      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const fileName = generateFileName(file.originalname);
      cb(null, fileName);
    },
  }),
  fileFilter: (req, file, cb) => {
    try {
      validateFile(file);
      cb(null, true);
    } catch (error) {
      cb(error, false);
    }
  },
};

// Конфигурация для множественной загрузки
export const multerMultipleConfig = {
  ...multerConfig,
  limits: {
    files: 5, // Максимум 5 файлов за раз
  },
};
