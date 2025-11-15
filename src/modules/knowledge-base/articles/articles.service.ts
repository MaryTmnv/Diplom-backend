import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ArticleCategory } from '@prisma/client';
import { PrismaService } from 'src/modules/database/prisma.service';
import { ArticleFiltersDto } from '../dto/article-filters.dto';
import { CreateArticleDto } from '../dto/create-article.dto';
import { RateArticleDto } from '../dto/rate-article.dto';
import { UpdateArticleDto } from '../dto/update-article.dto';


@Injectable()
export class ArticlesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateArticleDto) {
    // Проверяем уникальность slug
    const existingArticle = await this.prisma.article.findUnique({
      where: { slug: dto.slug },
    });

    if (existingArticle) {
      throw new ConflictException('Статья с таким slug уже существует');
    }

    // Создаём статью
    const article = await this.prisma.article.create({
      data: {
        title: dto.title,
        slug: dto.slug,
        excerpt: dto.excerpt,
        content: dto.content,
        category: dto.category,
        readingTime: dto.readingTime,
        isPublished: dto.isPublished,
        // Связываем с другими статьями
        relatedArticles: dto.relatedArticleIds
          ? {
              create: dto.relatedArticleIds.map((relatedId) => ({
                relatedArticleId: relatedId,
              })),
            }
          : undefined,
      },
      include: {
        relatedArticles: {
          include: {
            relatedArticle: {
              select: {
                id: true,
                title: true,
                slug: true,
                excerpt: true,
                category: true,
                readingTime: true,
              },
            },
          },
        },
      },
    });

    return article;
  }

  async findAll(filters: ArticleFiltersDto) {
    const where: any = { isPublished: true };

    // Фильтр по категории
    if (filters.category) {
      where.category = filters.category;
    }

    // Поиск
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { excerpt: { contains: filters.search, mode: 'insensitive' } },
        { content: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Определяем сортировку
    let orderBy: any = {};
    switch (filters.sortBy) {
      case 'popular':
        orderBy = { views: 'desc' };
        break;
      case 'recent':
        orderBy = { createdAt: 'desc' };
        break;
      case 'helpful':
        orderBy = { helpfulCount: 'desc' };
        break;
      default:
        orderBy = { views: 'desc' };
    }

    // Пагинация
    const skip = (filters.page - 1) * filters.limit;

    const [articles, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        skip,
        take: filters.limit,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          category: true,
          views: true,
          helpfulCount: true,
          notHelpfulCount: true,
          readingTime: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy,
      }),
      this.prisma.article.count({ where }),
    ]);

    return {
      data: articles.map((article) => ({
        ...article,
        helpfulPercentage: this.calculateHelpfulPercentage(article),
      })),
      meta: {
        total,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  }

  async findBySlug(slug: string, userId?: string) {
    const article = await this.prisma.article.findUnique({
      where: { slug, isPublished: true },
      include: {
        relatedArticles: {
          include: {
            relatedArticle: {
              select: {
                id: true,
                title: true,
                slug: true,
                excerpt: true,
                category: true,
                readingTime: true,
                views: true,
                helpfulCount: true,
                notHelpfulCount: true,
              },
            },
          },
          take: 3,
        },
      },
    });

    if (!article) {
      throw new NotFoundException('Статья не найдена');
    }

    // Проверяем, оценивал ли пользователь эту статью
    let userRating = null;
    if (userId) {
      userRating = await this.prisma.articleRating.findUnique({
        where: {
          articleId_userId: {
            articleId: article.id,
            userId,
          },
        },
      });
    }

    return {
      ...article,
      helpfulPercentage: this.calculateHelpfulPercentage(article),
      relatedArticles: article.relatedArticles.map((r) => ({
        ...r.relatedArticle,
        helpfulPercentage: this.calculateHelpfulPercentage(r.relatedArticle),
      })),
      userRating: userRating ? userRating.helpful : null,
    };
  }

  async search(query: string) {
    if (query.length < 3) {
      throw new BadRequestException('Поисковый запрос должен содержать минимум 3 символа');
    }

    const articles = await this.prisma.article.findMany({
      where: {
        isPublished: true,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { excerpt: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        category: true,
        readingTime: true,
        views: true,
        helpfulCount: true,
        notHelpfulCount: true,
      },
      take: 10,
      orderBy: [{ views: 'desc' }, { helpfulCount: 'desc' }],
    });

    return articles.map((article) => ({
      ...article,
      helpfulPercentage: this.calculateHelpfulPercentage(article),
    }));
  }

  async getPopular(limit: number = 6) {
    const articles = await this.prisma.article.findMany({
      where: { isPublished: true },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        category: true,
        views: true,
        helpfulCount: true,
        notHelpfulCount: true,
        readingTime: true,
      },
      orderBy: [{ views: 'desc' }, { helpfulCount: 'desc' }],
      take: limit,
    });

    return articles.map((article) => ({
      ...article,
      helpfulPercentage: this.calculateHelpfulPercentage(article),
    }));
  }

  async getByCategory(category: ArticleCategory, limit: number = 10) {
    const articles = await this.prisma.article.findMany({
      where: {
        category,
        isPublished: true,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        category: true,
        views: true,
        helpfulCount: true,
        notHelpfulCount: true,
        readingTime: true,
      },
      orderBy: { views: 'desc' },
      take: limit,
    });

    return articles.map((article) => ({
      ...article,
      helpfulPercentage: this.calculateHelpfulPercentage(article),
    }));
  }

  async update(id: string, dto: UpdateArticleDto) {
    const article = await this.prisma.article.findUnique({
      where: { id },
    });

    if (!article) {
      throw new NotFoundException('Статья не найдена');
    }

    // Если меняется slug - проверяем уникальность
    if (dto.slug && dto.slug !== article.slug) {
      const existingArticle = await this.prisma.article.findUnique({
        where: { slug: dto.slug },
      });

      if (existingArticle) {
        throw new ConflictException('Статья с таким slug уже существует');
      }
    }

    // Обновляем связанные статьи если указаны
    if (dto.relatedArticleIds) {
      // Удаляем старые связи
      await this.prisma.articleRelation.deleteMany({
        where: { articleId: id },
      });

      // Создаём новые
      await this.prisma.articleRelation.createMany({
        data: dto.relatedArticleIds.map((relatedId) => ({
          articleId: id,
          relatedArticleId: relatedId,
        })),
      });
    }

    return this.prisma.article.update({
      where: { id },
      data: {
        title: dto.title,
        slug: dto.slug,
        excerpt: dto.excerpt,
        content: dto.content,
        category: dto.category,
        readingTime: dto.readingTime,
        isPublished: dto.isPublished,
      },
      include: {
        relatedArticles: {
          include: {
            relatedArticle: true,
          },
        },
      },
    });
  }

  async delete(id: string) {
    const article = await this.prisma.article.findUnique({
      where: { id },
    });

    if (!article) {
      throw new NotFoundException('Статья не найдена');
    }

    await this.prisma.article.delete({
      where: { id },
    });

    return { message: 'Статья успешно удалена' };
  }

  async incrementViews(id: string) {
    await this.prisma.article.update({
      where: { id },
      data: { views: { increment: 1 } },
    });
  }

  async rateArticle(id: string, userId: string, dto: RateArticleDto) {
    const article = await this.prisma.article.findUnique({
      where: { id },
    });

    if (!article) {
      throw new NotFoundException('Статья не найдена');
    }

    // Проверяем, не оценивал ли пользователь уже
    const existingRating = await this.prisma.articleRating.findUnique({
      where: {
        articleId_userId: {
          articleId: id,
          userId,
        },
      },
    });

    if (existingRating) {
      // Обновляем оценку
      const oldHelpful = existingRating.helpful;

      await this.prisma.$transaction([
        this.prisma.articleRating.update({
          where: { id: existingRating.id },
          data: { helpful: dto.helpful },
        }),
        this.prisma.article.update({
          where: { id },
          data: {
            helpfulCount: {
              increment: dto.helpful ? (oldHelpful ? 0 : 1) : (oldHelpful ? -1 : 0),
            },
            notHelpfulCount: {
              increment: dto.helpful ? (oldHelpful ? 0 : -1) : (oldHelpful ? 1 : 0),
            },
          },
        }),
      ]);
    } else {
      // Создаём новую оценку
      await this.prisma.$transaction([
        this.prisma.articleRating.create({
          data: {
            articleId: id,
            userId,
            helpful: dto.helpful,
          },
        }),
        this.prisma.article.update({
          where: { id },
          data: {
            [dto.helpful ? 'helpfulCount' : 'notHelpfulCount']: { increment: 1 },
          },
        }),
      ]);
    }

    // Возвращаем обновлённую статью
    const updatedArticle = await this.prisma.article.findUnique({
      where: { id },
      select: {
        helpfulCount: true,
        notHelpfulCount: true,
      },
    });

    return {
      helpful: dto.helpful,
      helpfulCount: updatedArticle.helpfulCount,
      notHelpfulCount: updatedArticle.notHelpfulCount,
      helpfulPercentage: this.calculateHelpfulPercentage(updatedArticle),
    };
  }

  async getCategoriesStats() {
    const categories = await this.prisma.article.groupBy({
      by: ['category'],
      where: { isPublished: true },
      _count: {
        id: true,
      },
    });

    return categories.map((cat) => ({
      category: cat.category,
      count: cat._count.id,
      title: this.getCategoryTitle(cat.category),
    }));
  }

  private calculateHelpfulPercentage(article: {
    helpfulCount: number;
    notHelpfulCount: number;
  }): number {
    const total = article.helpfulCount + article.notHelpfulCount;
    if (total === 0) return 0;
    return Math.round((article.helpfulCount / total) * 100);
  }

  private getCategoryTitle(category: string): string {
    const titles = {
      CARDS: 'Карты',
      DEPOSITS: 'Вклады',
      LOANS: 'Кредиты',
      MOBILE_APP: 'Мобильное приложение',
      SECURITY: 'Безопасность',
    };
    return titles[category] || category;
  }
}
