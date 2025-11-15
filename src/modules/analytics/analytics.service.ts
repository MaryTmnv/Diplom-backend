import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import {
  OverviewStats,
  TicketsByStatus,
  TicketsByCategory,
  TicketsByPriority,
  OperatorPerformance,
  TopIssue,
  SLAViolation,
  TimeSeriesData,
} from './interfaces/analytics.interface';
import { TicketStatus, TicketCategory, TicketPriority, UserRole } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  private readonly SLA_THRESHOLD = 60; // 60 минут

  constructor(private prisma: PrismaService) {}

  async getOverview(query: AnalyticsQueryDto): Promise<OverviewStats> {
    const { dateFrom, dateTo } = this.getDateRange(query);
    const previousPeriod = this.getPreviousPeriod(dateFrom, dateTo);

    // Текущий период
    const [totalTickets, resolvedTickets, avgResolutionTime, avgRating] =
      await Promise.all([
        this.prisma.ticket.count({
          where: { createdAt: { gte: dateFrom, lte: dateTo } },
        }),
        this.prisma.ticket.count({
          where: {
            status: TicketStatus.RESOLVED,
            resolvedAt: { gte: dateFrom, lte: dateTo },
          },
        }),
        this.calculateAverageResolutionTime(dateFrom, dateTo),
        this.calculateAverageRating(dateFrom, dateTo),
      ]);

    // Предыдущий период (для сравнения)
    const [prevTotalTickets, prevResolvedTickets, prevAvgResolutionTime, prevAvgRating] =
      await Promise.all([
        this.prisma.ticket.count({
          where: {
            createdAt: { gte: previousPeriod.from, lte: previousPeriod.to },
          },
        }),
        this.prisma.ticket.count({
          where: {
            status: TicketStatus.RESOLVED,
            resolvedAt: { gte: previousPeriod.from, lte: previousPeriod.to },
          },
        }),
        this.calculateAverageResolutionTime(previousPeriod.from, previousPeriod.to),
        this.calculateAverageRating(previousPeriod.from, previousPeriod.to),
      ]);

    return {
      totalTickets,
      resolvedTickets,
      averageResolutionTime: avgResolutionTime,
      nps: avgRating,
      changes: {
        totalTickets: this.calculateChange(totalTickets, prevTotalTickets),
        resolvedTickets: this.calculateChange(resolvedTickets, prevResolvedTickets),
        averageResolutionTime: this.calculateChange(
          avgResolutionTime,
          prevAvgResolutionTime,
        ),
        nps: this.calculateChange(avgRating, prevAvgRating),
      },
    };
  }

  async getTicketsByStatus(query: AnalyticsQueryDto): Promise<TicketsByStatus[]> {
    const { dateFrom, dateTo } = this.getDateRange(query);

    const tickets = await this.prisma.ticket.groupBy({
      by: ['status'],
      where: { createdAt: { gte: dateFrom, lte: dateTo } },
      _count: true,
    });

    const total = tickets.reduce((sum, item) => sum + item._count, 0);

    return tickets.map((item) => ({
      status: this.getStatusTitle(item.status),
      count: item._count,
      percentage: total > 0 ? Math.round((item._count / total) * 100) : 0,
    }));
  }

  async getTicketsByCategory(query: AnalyticsQueryDto): Promise<TicketsByCategory[]> {
    const { dateFrom, dateTo } = this.getDateRange(query);

    const tickets = await this.prisma.ticket.groupBy({
      by: ['category'],
      where: { createdAt: { gte: dateFrom, lte: dateTo } },
      _count: true,
    });

    const total = tickets.reduce((sum, item) => sum + item._count, 0);

    return tickets
      .map((item) => ({
        category: item.category,
        title: this.getCategoryTitle(item.category),
        count: item._count,
        percentage: total > 0 ? Math.round((item._count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }

  async getTicketsByPriority(query: AnalyticsQueryDto): Promise<TicketsByPriority[]> {
    const { dateFrom, dateTo } = this.getDateRange(query);

    const tickets = await this.prisma.ticket.groupBy({
      by: ['priority'],
      where: { createdAt: { gte: dateFrom, lte: dateTo } },
      _count: true,
    });

    const total = tickets.reduce((sum, item) => sum + item._count, 0);

    return tickets.map((item) => ({
      priority: this.getPriorityTitle(item.priority),
      count: item._count,
      percentage: total > 0 ? Math.round((item._count / total) * 100) : 0,
    }));
  }

  async getOperatorPerformance(query: AnalyticsQueryDto): Promise<OperatorPerformance[]> {
    const { dateFrom, dateTo } = this.getDateRange(query);

    const operators = await this.prisma.user.findMany({
      where: {
        role: { in: [UserRole.OPERATOR, UserRole.SPECIALIST] },
        isActive: true,
      },
      include: {
        operatorStats: true,
        operatorTickets: {
          where: {
            status: TicketStatus.RESOLVED,
            resolvedAt: { gte: dateFrom, lte: dateTo },
          },
          select: {
            createdAt: true,
            resolvedAt: true,
          },
        },
        ratings: {
          where: {
            createdAt: { gte: dateFrom, lte: dateTo },
          },
          select: {
            rating: true,
          },
        },
        _count: {
          select: {
            operatorTickets: {
              where: {
                status: { in: [TicketStatus.NEW, TicketStatus.IN_PROGRESS] },
              },
            },
          },
        },
      },
    });

    return operators
      .map((operator) => {
        const resolvedCount = operator.operatorTickets.length;
        
        // Вычисляем среднее время решения за период
        const avgTime =
          resolvedCount > 0
            ? operator.operatorTickets.reduce((sum, ticket) => {
                const time = Math.floor(
                  (ticket.resolvedAt.getTime() - ticket.createdAt.getTime()) / 60000,
                );
                return sum + time;
              }, 0) / resolvedCount
            : 0;

        // Вычисляем среднюю оценку за период
        const avgRating =
          operator.ratings.length > 0
            ? operator.ratings.reduce((sum, r) => sum + r.rating, 0) /
              operator.ratings.length
            : 0;

        return {
          operator: {
            id: operator.id,
            firstName: operator.firstName,
            lastName: operator.lastName,
            avatar: operator.avatar,
          },
          resolvedCount,
          averageTime: Math.round(avgTime),
          rating: Number(avgRating.toFixed(1)),
          activeTickets: operator._count.operatorTickets,
        };
      })
      .sort((a, b) => b.resolvedCount - a.resolvedCount);
  }

  async getTopIssues(query: AnalyticsQueryDto, limit: number = 10): Promise<TopIssue[]> {
    const { dateFrom, dateTo } = this.getDateRange(query);

    // Группируем по категориям
    const byCategory = await this.prisma.ticket.groupBy({
      by: ['category'],
      where: { createdAt: { gte: dateFrom, lte: dateTo } },
      _count: true,
      orderBy: { _count: { category: 'desc' } },
      take: limit,
    });

    return byCategory.map((item) => ({
      title: this.getCategoryTitle(item.category),
      category: item.category,
      count: item._count,
    }));
  }

  async getSLAViolations(query: AnalyticsQueryDto): Promise<SLAViolation[]> {
    const { dateFrom, dateTo } = this.getDateRange(query);

    const tickets = await this.prisma.ticket.findMany({
      where: {
        createdAt: { gte: dateFrom, lte: dateTo },
        status: { in: [TicketStatus.RESOLVED, TicketStatus.CLOSED] },
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        operator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    const violations = tickets
      .map((ticket) => {
        if (!ticket.resolvedAt) return null;

        const resolutionTime = Math.floor(
          (ticket.resolvedAt.getTime() - ticket.createdAt.getTime()) / 60000,
        );

        if (resolutionTime > this.SLA_THRESHOLD) {
          return {
            ticket: {
              id: ticket.id,
              number: ticket.number,
              title: ticket.title,
              client: ticket.client,
              operator: ticket.operator,
            },
            violationTime: resolutionTime - this.SLA_THRESHOLD,
            createdAt: ticket.createdAt,
            resolvedAt: ticket.resolvedAt,
          };
        }
        return null;
      })
      .filter(Boolean);

    return violations.sort((a, b) => b.violationTime - a.violationTime);
  }

  async getTicketsTimeSeries(query: AnalyticsQueryDto): Promise<TimeSeriesData[]> {
    const { dateFrom, dateTo } = this.getDateRange(query);

    const tickets = await this.prisma.ticket.findMany({
      where: {
        createdAt: { gte: dateFrom, lte: dateTo },
      },
      select: {
        createdAt: true,
      },
    });

    // Группируем по дням
    const grouped = new Map<string, number>();

    tickets.forEach((ticket) => {
      const date = ticket.createdAt.toISOString().split('T')[0];
      grouped.set(date, (grouped.get(date) || 0) + 1);
    });

    // Преобразуем в массив и сортируем
    return Array.from(grouped.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async getResolutionTimeTrend(query: AnalyticsQueryDto): Promise<TimeSeriesData[]> {
    const { dateFrom, dateTo } = this.getDateRange(query);

    const tickets = await this.prisma.ticket.findMany({
      where: {
        status: TicketStatus.RESOLVED,
        resolvedAt: { gte: dateFrom, lte: dateTo },
      },
      select: {
        createdAt: true,
        resolvedAt: true,
      },
    });

    // Группируем по дням и вычисляем среднее время
    const grouped = new Map<string, { total: number; count: number }>();

    tickets.forEach((ticket) => {
      const date = ticket.resolvedAt.toISOString().split('T')[0];
      const time = Math.floor(
        (ticket.resolvedAt.getTime() - ticket.createdAt.getTime()) / 60000,
      );

      const current = grouped.get(date) || { total: 0, count: 0 };
      grouped.set(date, {
        total: current.total + time,
        count: current.count + 1,
      });
    });

    return Array.from(grouped.entries())
      .map(([date, data]) => ({
        date,
        count: Math.round(data.total / data.count),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async getClientSatisfaction(query: AnalyticsQueryDto) {
    const { dateFrom, dateTo } = this.getDateRange(query);

    const ratings = await this.prisma.ticketRating.findMany({
      where: {
        createdAt: { gte: dateFrom, lte: dateTo },
      },
      select: {
        rating: true,
        likedSpeed: true,
        likedClarity: true,
        likedPoliteness: true,
        likedCompleteness: true,
      },
    });

    if (ratings.length === 0) {
      return {
        averageRating: 0,
        totalRatings: 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        aspects: {
          speed: 0,
          clarity: 0,
          politeness: 0,
          completeness: 0,
        },
      };
    }

    // Распределение оценок
    const distribution = {
      5: ratings.filter((r) => r.rating === 5).length,
      4: ratings.filter((r) => r.rating === 4).length,
      3: ratings.filter((r) => r.rating === 3).length,
      2: ratings.filter((r) => r.rating === 2).length,
      1: ratings.filter((r) => r.rating === 1).length,
    };

    // Средняя оценка
    const averageRating =
      ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;

    // Аспекты качества (в процентах)
    const aspects = {
      speed: Math.round(
        (ratings.filter((r) => r.likedSpeed).length / ratings.length) * 100,
      ),
      clarity: Math.round(
        (ratings.filter((r) => r.likedClarity).length / ratings.length) * 100,
      ),
      politeness: Math.round(
        (ratings.filter((r) => r.likedPoliteness).length / ratings.length) * 100,
      ),
      completeness: Math.round(
        (ratings.filter((r) => r.likedCompleteness).length / ratings.length) * 100,
      ),
    };

    return {
      averageRating: Number(averageRating.toFixed(2)),
      totalRatings: ratings.length,
      distribution,
      aspects,
    };
  }

  async getPeakHours(query: AnalyticsQueryDto) {
    const { dateFrom, dateTo } = this.getDateRange(query);

    const tickets = await this.prisma.ticket.findMany({
      where: {
        createdAt: { gte: dateFrom, lte: dateTo },
      },
      select: {
        createdAt: true,
      },
    });

    // Группируем по часам (0-23)
    const hourlyDistribution = new Array(24).fill(0);

    tickets.forEach((ticket) => {
      const hour = ticket.createdAt.getHours();
      hourlyDistribution[hour]++;
    });

    return hourlyDistribution.map((count, hour) => ({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      count,
    }));
  }

  async getResponseTimeStats(query: AnalyticsQueryDto) {
    const { dateFrom, dateTo } = this.getDateRange(query);

    const tickets = await this.prisma.ticket.findMany({
      where: {
        createdAt: { gte: dateFrom, lte: dateTo },
        assignedAt: { not: null },
      },
      select: {
        createdAt: true,
        assignedAt: true,
      },
    });

    if (tickets.length === 0) {
      return {
        averageResponseTime: 0,
        fastestResponse: 0,
        slowestResponse: 0,
      };
    }

    const responseTimes = tickets.map((ticket) =>
      Math.floor((ticket.assignedAt.getTime() - ticket.createdAt.getTime()) / 60000),
    );

    return {
      averageResponseTime: Math.round(
        responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
      ),
      fastestResponse: Math.min(...responseTimes),
      slowestResponse: Math.max(...responseTimes),
    };
  }

  async exportData(query: AnalyticsQueryDto, format: string) {
    const { dateFrom, dateTo } = this.getDateRange(query);

    const data = {
      period: {
        from: dateFrom.toISOString(),
        to: dateTo.toISOString(),
      },
      overview: await this.getOverview(query),
      byStatus: await this.getTicketsByStatus(query),
      byCategory: await this.getTicketsByCategory(query),
      byPriority: await this.getTicketsByPriority(query),
      operatorPerformance: await this.getOperatorPerformance(query),
      topIssues: await this.getTopIssues(query),
      slaViolations: await this.getSLAViolations(query),
      clientSatisfaction: await this.getClientSatisfaction(query),
      generatedAt: new Date().toISOString(),
    };

    if (format === 'csv') {
      return this.convertToCSV(data);
    }

    return data;
  }

  // ============================================
  // Helper methods
  // ============================================

  private getDateRange(query: AnalyticsQueryDto): { dateFrom: Date; dateTo: Date } {
    const now = new Date();
    let dateTo = now;
    let dateFrom: Date;

    if (query.period === 'custom') {
      if (!query.dateFrom || !query.dateTo) {
        throw new Error('Для custom периода необходимо указать dateFrom и dateTo');
      }
      dateFrom = new Date(query.dateFrom);
      dateTo = new Date(query.dateTo);
    } else {
      switch (query.period) {
        case 'today':
          dateFrom = new Date(now.setHours(0, 0, 0, 0));
          dateTo = new Date(now.setHours(23, 59, 59, 999));
          break;
        case 'week':
          dateFrom = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          dateFrom = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case 'quarter':
          dateFrom = new Date(now.setMonth(now.getMonth() - 3));
          break;
        case 'year':
          dateFrom = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
        default:
          dateFrom = new Date(now.setDate(now.getDate() - 7));
      }
    }

    return { dateFrom, dateTo };
  }

  private getPreviousPeriod(from: Date, to: Date) {
    const diff = to.getTime() - from.getTime();
    return {
      from: new Date(from.getTime() - diff),
      to: new Date(from.getTime()),
    };
  }

  private calculateChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  private async calculateAverageResolutionTime(from: Date, to: Date): Promise<number> {
    const tickets = await this.prisma.ticket.findMany({
      where: {
        status: TicketStatus.RESOLVED,
        resolvedAt: { gte: from, lte: to },
      },
      select: {
        createdAt: true,
        resolvedAt: true,
      },
    });

    if (tickets.length === 0) return 0;

    const totalTime = tickets.reduce((sum, ticket) => {
      const time = Math.floor(
        (ticket.resolvedAt.getTime() - ticket.createdAt.getTime()) / 60000,
      );
      return sum + time;
    }, 0);

    return Math.round(totalTime / tickets.length);
  }

  private async calculateAverageRating(from: Date, to: Date): Promise<number> {
    const ratings = await this.prisma.ticketRating.findMany({
      where: {
        createdAt: { gte: from, lte: to },
      },
      select: { rating: true },
    });

    if (ratings.length === 0) return 0;

    const totalRating = ratings.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = totalRating / ratings.length;

    // Конвертируем в процент (5 звёзд = 100%)
    return Math.round((avgRating / 5) * 100);
  }

  private getStatusTitle(status: TicketStatus): string {
    const titles = {
      [TicketStatus.NEW]: 'Новая',
      [TicketStatus.IN_PROGRESS]: 'В работе',
      [TicketStatus.WAITING]: 'Ожидание',
      [TicketStatus.RESOLVED]: 'Решена',
      [TicketStatus.CLOSED]: 'Закрыта',
    };
    return titles[status] || status;
  }

  private getCategoryTitle(category: TicketCategory): string {
    const titles = {
      [TicketCategory.CARDS]: 'Проблемы с картами',
      [TicketCategory.MOBILE_APP]: 'Мобильное приложение',
      [TicketCategory.PAYMENTS]: 'Платежи и переводы',
      [TicketCategory.SECURITY]: 'Безопасность',
      [TicketCategory.DEPOSITS]: 'Вклады',
      [TicketCategory.LOANS]: 'Кредиты',
      [TicketCategory.OTHER]: 'Другое',
    };
    return titles[category] || category;
  }

  private getPriorityTitle(priority: TicketPriority): string {
    const titles = {
      [TicketPriority.LOW]: 'Низкий',
      [TicketPriority.MEDIUM]: 'Средний',
      [TicketPriority.HIGH]: 'Высокий',
      [TicketPriority.CRITICAL]: 'Критический',
    };
    return titles[priority] || priority;
  }

  private convertToCSV(data: any): string {
    // Простая конвертация в CSV
    let csv = 'Report Generated: ' + data.generatedAt + '\n\n';

    // Overview
    csv += 'OVERVIEW\n';
    csv += 'Metric,Value,Change\n';
    csv += `Total Tickets,${data.overview.totalTickets},${data.overview.changes.totalTickets}%\n`;
    csv += `Resolved Tickets,${data.overview.resolvedTickets},${data.overview.changes.resolvedTickets}%\n`;
    csv += `Avg Resolution Time,${data.overview.averageResolutionTime} min,${data.overview.changes.averageResolutionTime}%\n`;
    csv += `NPS,${data.overview.nps}%,${data.overview.changes.nps}%\n\n`;

    // By Status
    csv += 'TICKETS BY STATUS\n';
    csv += 'Status,Count,Percentage\n';
    data.byStatus.forEach((item) => {
      csv += `${item.status},${item.count},${item.percentage}%\n`;
    });
    csv += '\n';

    // By Category
    csv += 'TICKETS BY CATEGORY\n';
    csv += 'Category,Count,Percentage\n';
    data.byCategory.forEach((item) => {
      csv += `${item.title},${item.count},${item.percentage}%\n`;
    });
    csv += '\n';

    // Operator Performance
    csv += 'OPERATOR PERFORMANCE\n';
    csv += 'Operator,Resolved,Avg Time (min),Rating,Active\n';
    data.operatorPerformance.forEach((item) => {
      csv += `${item.operator.firstName} ${item.operator.lastName},${item.resolvedCount},${item.averageTime},${item.rating},${item.activeTickets}\n`;
    });

    return csv;
  }
}
