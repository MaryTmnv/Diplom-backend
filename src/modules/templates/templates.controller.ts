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
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { TemplateFiltersDto } from './dto/template-filters.dto';
import { UseTemplateDto } from './dto/use-template.dto';
import { RateTemplateDto } from './dto/rate-template.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TicketCategory, UserRole } from '@prisma/client';

@ApiTags('Templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  @Roles(UserRole.OPERATOR, UserRole.SPECIALIST, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Получить список шаблонов' })
  @ApiResponse({ status: 200, description: 'Список шаблонов' })
  findAll(@Query() filters: TemplateFiltersDto) {
    return this.templatesService.findAll(filters);
  }

  @Get('popular')
  @Roles(UserRole.OPERATOR, UserRole.SPECIALIST, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Получить популярные шаблоны' })
  @ApiResponse({ status: 200, description: 'Популярные шаблоны' })
  getPopular(@Query('limit') limit?: number) {
    return this.templatesService.getPopular(limit);
  }

  @Get('most-used')
  @Roles(UserRole.OPERATOR, UserRole.SPECIALIST, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Получить самые используемые шаблоны' })
  @ApiResponse({ status: 200, description: 'Самые используемые шаблоны' })
  getMostUsed(@Query('limit') limit?: number) {
    return this.templatesService.getMostUsed(limit);
  }

  @Get('top-rated')
  @Roles(UserRole.OPERATOR, UserRole.SPECIALIST, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Получить лучшие шаблоны по оценкам' })
  @ApiResponse({ status: 200, description: 'Лучшие шаблоны' })
  getTopRated(@Query('limit') limit?: number) {
    return this.templatesService.getTopRated(limit);
  }

  @Get('stats')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Получить статистику по категориям' })
  @ApiResponse({ status: 200, description: 'Статистика шаблонов' })
  getStatsByCategory() {
    return this.templatesService.getStatsByCategory();
  }

  @Get('category/:category')
  @Roles(UserRole.OPERATOR, UserRole.SPECIALIST, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Получить шаблоны по категории' })
  @ApiResponse({ status: 200, description: 'Шаблоны категории' })
  getByCategory(@Param('category') category: TicketCategory) {
    return this.templatesService.findByCategory(category);
  }

  @Get(':id')
  @Roles(UserRole.OPERATOR, UserRole.SPECIALIST, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Получить шаблон по ID' })
  @ApiResponse({ status: 200, description: 'Детали шаблона' })
  @ApiResponse({ status: 404, description: 'Шаблон не найден' })
  findOne(@Param('id') id: string) {
    return this.templatesService.findOne(id);
  }

  @Post(':id/use')
  @Roles(UserRole.OPERATOR, UserRole.SPECIALIST, UserRole.MANAGER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Использовать шаблон (подставить переменные)' })
  @ApiResponse({ status: 200, description: 'Обработанный шаблон' })
  @ApiResponse({ status: 404, description: 'Шаблон не найден' })
  useTemplate(@Param('id') id: string, @Body() dto: UseTemplateDto) {
    return this.templatesService.useTemplate(id, dto);
  }

  @Post(':id/rate')
  @Roles(UserRole.OPERATOR, UserRole.SPECIALIST, UserRole.MANAGER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Оценить шаблон' })
  @ApiResponse({ status: 200, description: 'Оценка сохранена' })
  @ApiResponse({ status: 404, description: 'Шаблон не найден' })
  rateTemplate(@Param('id') id: string, @Body() dto: RateTemplateDto) {
    return this.templatesService.rateTemplate(id, dto);
  }

  // ============================================
  // Admin endpoints
  // ============================================

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Создать шаблон (только для админов)' })
  @ApiResponse({ status: 201, description: 'Шаблон успешно создан' })
  @ApiResponse({ status: 403, description: 'Недостаточно прав' })
  create(@Body() dto: CreateTemplateDto) {
    return this.templatesService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Обновить шаблон (только для админов)' })
  @ApiResponse({ status: 200, description: 'Шаблон успешно обновлён' })
  @ApiResponse({ status: 404, description: 'Шаблон не найден' })
  update(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return this.templatesService.update(id, dto);
  }

  @Patch(':id/toggle')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Активировать/деактивировать шаблон' })
  @ApiResponse({ status: 200, description: 'Статус шаблона изменён' })
  toggleActive(@Param('id') id: string) {
    return this.templatesService.toggleActive(id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Удалить шаблон (только для админов)' })
  @ApiResponse({ status: 200, description: 'Шаблон успешно удалён' })
  @ApiResponse({ status: 404, description: 'Шаблон не найден' })
  remove(@Param('id') id: string) {
    return this.templatesService.delete(id);
  }
}
