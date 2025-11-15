import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { TemplateFiltersDto } from './dto/template-filters.dto';
import { UseTemplateDto } from './dto/use-template.dto';
import { RateTemplateDto } from './dto/rate-template.dto';
import { TicketCategory } from '@prisma/client';

@Injectable()
export class TemplatesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTemplateDto) {
    // Извлекаем переменные из контента если не указаны
    const variables = dto.variables || this.extractVariables(dto.content);

    const template = await this.prisma.template.create({
      data: {
        title: dto.title,
        content: dto.content,
        category: dto.category,
        variables,
        isActive: dto.isActive,
      },
    });

    return template;
  }

  async findAll(filters: TemplateFiltersDto) {
    const where: any = {};

    // Фильтр по активности
    if (filters.activeOnly) {
      where.isActive = true;
    }

    // Фильтр по категории
    if (filters.category) {
      where.category = filters.category;
    }

    // Поиск
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { content: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Определяем сортировку
    let orderBy: any = {};
    switch (filters.sortBy) {
      case 'popular':
        orderBy = { usageCount: 'desc' };
        break;
      case 'recent':
        orderBy = { createdAt: 'desc' };
        break;
      case 'rated':
        orderBy = { rating: 'desc' };
        break;
      default:
        orderBy = { usageCount: 'desc' };
    }

    // Пагинация
    const skip = (filters.page - 1) * filters.limit;

    const [templates, total] = await Promise.all([
      this.prisma.template.findMany({
        where,
        skip,
        take: filters.limit,
        orderBy,
      }),
      this.prisma.template.count({ where }),
    ]);

    return {
      data: templates,
      meta: {
        total,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  }

  async findOne(id: string) {
    const template = await this.prisma.template.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException('Шаблон не найден');
    }

    return template;
  }

  async findByCategory(category: TicketCategory) {
    return this.prisma.template.findMany({
      where: {
        category,
        isActive: true,
      },
      orderBy: [{ usageCount: 'desc' }, { rating: 'desc' }],
    });
  }

  async getPopular(limit: number = 10) {
    return this.prisma.template.findMany({
      where: { isActive: true },
      orderBy: [{ usageCount: 'desc' }, { rating: 'desc' }],
      take: limit,
    });
  }

  async update(id: string, dto: UpdateTemplateDto) {
    const template = await this.prisma.template.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException('Шаблон не найден');
    }

    // Если обновляется content - перевычисляем переменные
    const variables = dto.content
      ? dto.variables || this.extractVariables(dto.content)
      : dto.variables;

    return this.prisma.template.update({
      where: { id },
      data: {
        title: dto.title,
        content: dto.content,
        category: dto.category,
        variables,
        isActive: dto.isActive,
      },
    });
  }

  async delete(id: string) {
    const template = await this.prisma.template.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException('Шаблон не найден');
    }

    await this.prisma.template.delete({
      where: { id },
    });

    return { message: 'Шаблон успешно удалён' };
  }

  async useTemplate(id: string, dto?: UseTemplateDto) {
    const template = await this.findOne(id);

    if (!template.isActive) {
      throw new BadRequestException('Шаблон неактивен');
    }

    // Увеличиваем счётчик использования
    await this.prisma.template.update({
      where: { id },
      data: {
        usageCount: { increment: 1 },
      },
    });

    // Заменяем переменные на значения
    let processedContent = template.content;

    if (dto?.variables) {
      Object.entries(dto.variables).forEach(([key, value]) => {
        const regex = new RegExp(`\\{${key}\\}`, 'g');
        processedContent = processedContent.replace(regex, value);
      });
    }

    return {
      id: template.id,
      title: template.title,
      content: processedContent,
      originalContent: template.content,
      variables: template.variables,
      usedVariables: dto?.variables || {},
    };
  }

  async rateTemplate(id: string, dto: RateTemplateDto) {
    const template = await this.findOne(id);

    // Вычисляем новую среднюю оценку
    // Простая формула: (текущая_оценка * количество + новая_оценка) / (количество + 1)
    // Для упрощения используем счётчик использований как количество оценок
    const currentTotal = template.rating * template.usageCount;
    const newTotal = currentTotal + dto.rating;
    const newCount = template.usageCount + 1;
    const newRating = newTotal / newCount;

    await this.prisma.template.update({
      where: { id },
      data: {
        rating: newRating,
      },
    });

    return {
      templateId: id,
      newRating: Number(newRating.toFixed(1)),
    };
  }

  async toggleActive(id: string) {
    const template = await this.findOne(id);

    return this.prisma.template.update({
      where: { id },
      data: {
        isActive: !template.isActive,
      },
    });
  }

  async getStatsByCategory() {
    const stats = await this.prisma.template.groupBy({
      by: ['category'],
      where: { isActive: true },
      _count: {
        id: true,
      },
      _sum: {
        usageCount: true,
      },
      _avg: {
        rating: true,
      },
    });

    return stats.map((stat) => ({
      category: stat.category,
      totalTemplates: stat._count.id,
      totalUsage: stat._sum.usageCount || 0,
      averageRating: stat._avg.rating ? Number(stat._avg.rating.toFixed(1)) : 0,
      title: this.getCategoryTitle(stat.category),
    }));
  }

  async getMostUsed(limit: number = 5) {
    return this.prisma.template.findMany({
      where: { isActive: true },
      orderBy: { usageCount: 'desc' },
      take: limit,
    });
  }

  async getTopRated(limit: number = 5) {
    return this.prisma.template.findMany({
      where: { isActive: true },
      orderBy: { rating: 'desc' },
      take: limit,
    });
  }

  // Извлечение переменных из текста шаблона
  private extractVariables(content: string): string[] {
    const regex = /\{([a-zA-Z0-9_]+)\}/g;
    const variables = new Set<string>();
    let match;

    while ((match = regex.exec(content)) !== null) {
      variables.add(match[1]);
    }

    return Array.from(variables);
  }

  private getCategoryTitle(category: TicketCategory): string {
    const titles = {
      CARDS: 'Карты',
      DEPOSITS: 'Вклады',
      LOANS: 'Кредиты',
      MOBILE_APP: 'Мобильное приложение',
      PAYMENTS: 'Платежи и переводы',
      SECURITY: 'Безопасность',
      OTHER: 'Другое',
    };
    return titles[category] || category;
  }
}
