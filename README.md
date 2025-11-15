# HelpMate Backend API

Система учёта заявок в службу технической поддержки банка.

##  Технологический стек

- **Runtime**: Node.js 20+
- **Framework**: NestJS 10+
- **Language**: TypeScript 5.0+
- **ORM**: Prisma 5.0+
- **Database**: PostgreSQL 15+
- **Cache**: Redis 7+
- **Package Manager**: npm

##  Установка

```bash
# Установка зависимостей
npm install

# Генерация Prisma Client
npm run prisma:generate

# Применение миграций
npm run prisma:migrate

# Заполнение тестовыми данными
npm run prisma:seed
