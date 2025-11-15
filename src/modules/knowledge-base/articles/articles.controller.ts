// src/modules/knowledge-base/articles.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ArticlesService } from './articles.service';
import { UserRole } from '@prisma/client';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { ArticleFiltersDto } from '../dto/article-filters.dto';
import { CreateArticleDto } from '../dto/create-article.dto';
import { RateArticleDto } from '../dto/rate-article.dto';
import { UpdateArticleDto } from '../dto/update-article.dto';
import { Public } from 'src/common/decorators/public.decorator';

@ApiTags('Knowledge Base')
@Controller('articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Получить список статей' })
  @ApiResponse({ status: 200, description: 'Список статей' })
  findAll(@Query() filters: ArticleFiltersDto) {
    return this.articlesService.findAll(filters);
  }

  @Public()
  @Get('popular')
  @ApiOperation({ summary: 'Получить популярные статьи' })
  @ApiResponse({ status: 200, description: 'Популярные статьи' })
  getPopular(@Query('limit') limit?: number) {
    return this.articlesService.getPopular(limit);
  }

  @Public()
  @Get('search')
  @ApiOperation({ summary: 'Поиск статей' })
  @ApiResponse({ status: 200, description: 'Результаты поиска' })
  search(@Query('q') query: string) {
    return this.articlesService.search(query);
  }

  @Public()
  @Get('categories')
  @ApiOperation({ summary: 'Получить статистику по категориям' })
  @ApiResponse({ status: 200, description: 'Статистика категорий' })
  getCategoriesStats() {
    return this.articlesService.getCategoriesStats();
  }

  @Public()
  @Get('category/:category')
  @ApiOperation({ summary: 'Получить статьи по категории' })
  @ApiResponse({ status: 200, description: 'Статьи категории' })
  getByCategory(
    @Param('category') category: string,
    @Query('limit') limit?: number,
  ) {
    return this.articlesService.getByCategory(category as any, limit);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Получить статью по slug' })
  @ApiResponse({ status: 200, description: 'Детали статьи' })
  @ApiResponse({ status: 404, description: 'Статья не найдена' })
  async findBySlug(@Param('slug') slug: string, @CurrentUser() user?: any) {
    const article = await this.articlesService.findBySlug(slug, user?.id);

    // Увеличиваем счётчик просмотров
    await this.articlesService.incrementViews(article.id);

    return article;
  }

  @Post(':id/view')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Увеличить счётчик просмотров' })
  @ApiResponse({ status: 200, description: 'Счётчик увеличен' })
  incrementViews(@Param('id') id: string) {
    return this.articlesService.incrementViews(id);
  }

  @Post(':id/rate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Оценить статью' })
  @ApiResponse({ status: 200, description: 'Оценка сохранена' })
  @ApiResponse({ status: 404, description: 'Статья не найдена' })
  rateArticle(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: RateArticleDto,
  ) {
    return this.articlesService.rateArticle(id, user.id, dto);
  }

  // ============================================
  // Admin endpoints
  // ============================================

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать статью (только для админов)' })
  @ApiResponse({ status: 201, description: 'Статья успешно создана' })
  @ApiResponse({ status: 403, description: 'Недостаточно прав' })
  @ApiResponse({ status: 409, description: 'Статья с таким slug уже существует' })
  create(@Body() dto: CreateArticleDto) {
    return this.articlesService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить статью (только для админов)' })
  @ApiResponse({ status: 200, description: 'Статья успешно обновлена' })
  @ApiResponse({ status: 404, description: 'Статья не найдена' })
  update(@Param('id') id: string, @Body() dto: UpdateArticleDto) {
    return this.articlesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Удалить статью (только для админов)' })
  @ApiResponse({ status: 200, description: 'Статья успешно удалена' })
  @ApiResponse({ status: 404, description: 'Статья не найдена' })
  remove(@Param('id') id: string) {
    return this.articlesService.delete(id);
  }
}
