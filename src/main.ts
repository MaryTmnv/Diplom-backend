import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // CORS
  app.enableCors({
   origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://help-mate-3j1hdo1ek-marytmnvs-projects.vercel.app',
      'https://help-mate-nzq4q5gyb-marytmnvs-projects.vercel.app',
      'https://helpmate.vercel.app',
      'https://help-mate-msz2m019w-marytmnvs-projects.vercel.app/',
      process.env.FRONTEND_URL, 
    ].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
     exposedHeaders: ['Authorization'],  
    preflightContinue: false,  
    optionsSuccessStatus: 204,  

  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Статические файлы (для загрузок)
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
}

bootstrap();
