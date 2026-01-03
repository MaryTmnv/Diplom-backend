import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // CORS - финальная версия (больше не нужно менять!)
  app.enableCors({
    origin: (origin, callback) => {
      // Разрешить запросы без origin (Postman, curl)
      if (!origin) {
        return callback(null, true);
      }

      // Разрешить localhost для разработки
      if (origin.startsWith('http://localhost')) {
        return callback(null, true);
      }

      // Разрешить ВСЕ Vercel deployments (production + preview)
      if (
        origin.endsWith('.vercel.app') &&
        (origin.includes('help-mate') || origin.includes('helpmate'))
      ) {
        return callback(null, true);
      }

      // Разрешить твой production domain (если будет)
      if (origin === 'https://helpmate.com') {
        return callback(null, true);
      }

      // Логировать заблокированные origins
      console.log('❌ CORS blocked:', origin);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Authorization'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Статические файлы
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('HelpMate API')
      .setDescription('API документация для системы HelpMate')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('Auth', 'Аутентификация и авторизация')
      .addTag('Users', 'Управление пользователями')
      .addTag('Tickets', 'Управление заявками')
      .addTag('Messages', 'Сообщения и чат')
      .addTag('Files', 'Загрузка и управление файлами')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  // Graceful shutdown
  app.enableShutdownHooks();

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Application running on: http://localhost:${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
  console.log(`✅ CORS: Enabled for all Vercel deployments`);
}

bootstrap();
