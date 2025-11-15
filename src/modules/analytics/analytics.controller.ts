import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Response } from 'express';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ExportReportDto } from './dto/export-repot.dto';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MANAGER, UserRole.ADMIN)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Получить общую статистику' })
  @ApiResponse({ status: 200, description: 'Общая статистика' })
  getOverview(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getOverview(query);
  }

  @Get('tickets-by-status')
  @ApiOperation({ summary: 'Распределение заявок по статусам' })
  @ApiResponse({ status: 200, description: 'Заявки по статусам' })
  getTicketsByStatus(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getTicketsByStatus(query);
  }

  @Get('tickets-by-category')
  @ApiOperation({ summary: 'Распределение заявок по категориям' })
  @ApiResponse({ status: 200, description: 'Заявки по категориям' })
  getTicketsByCategory(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getTicketsByCategory(query);
  }

  @Get('tickets-by-priority')
  @ApiOperation({ summary: 'Распределение заявок по приоритетам' })
  @ApiResponse({ status: 200, description: 'Заявки по приоритетам' })
  getTicketsByPriority(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getTicketsByPriority(query);
  }

  @Get('operator-performance')
  @ApiOperation({ summary: 'Производительность операторов' })
  @ApiResponse({ status: 200, description: 'Статистика операторов' })
  getOperatorPerformance(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getOperatorPerformance(query);
  }

  @Get('top-issues')
  @ApiOperation({ summary: 'Топ проблем' })
  @ApiResponse({ status: 200, description: 'Самые частые проблемы' })
  getTopIssues(@Query() query: AnalyticsQueryDto, @Query('limit') limit?: number) {
    return this.analyticsService.getTopIssues(query, limit);
  }

  @Get('sla-violations')
  @ApiOperation({ summary: 'Нарушения SLA' })
  @ApiResponse({ status: 200, description: 'Список нарушений SLA' })
  getSLAViolations(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getSLAViolations(query);
  }

  @Get('tickets-time-series')
  @ApiOperation({ summary: 'Динамика создания заявок по дням' })
  @ApiResponse({ status: 200, description: 'Временной ряд заявок' })
  getTicketsTimeSeries(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getTicketsTimeSeries(query);
  }

  @Get('resolution-time-trend')
  @ApiOperation({ summary: 'Тренд времени решения заявок' })
  @ApiResponse({ status: 200, description: 'Тренд времени решения' })
  getResolutionTimeTrend(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getResolutionTimeTrend(query);
  }

  @Get('client-satisfaction')
  @ApiOperation({ summary: 'Удовлетворённость клиентов' })
  @ApiResponse({ status: 200, description: 'Статистика удовлетворённости' })
  getClientSatisfaction(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getClientSatisfaction(query);
  }

  @Get('peak-hours')
  @ApiOperation({ summary: 'Пиковые часы обращений' })
  @ApiResponse({ status: 200, description: 'Распределение по часам' })
  getPeakHours(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getPeakHours(query);
  }

  @Get('response-time-stats')
  @ApiOperation({ summary: 'Статистика времени первого ответа' })
  @ApiResponse({ status: 200, description: 'Статистика времени ответа' })
  getResponseTimeStats(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getResponseTimeStats(query);
  }

  @Post('export')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Экспортировать отчёт' })
  @ApiResponse({ status: 200, description: 'Отчёт экспортирован' })
  async exportReport(@Body() dto: ExportReportDto, @Res() res: Response) {
    const data = await this.analyticsService.exportData(dto, dto.format);

    if (dto.format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="analytics-report-${new Date().toISOString()}.csv"`,
      );
      res.send(data);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="analytics-report-${new Date().toISOString()}.json"`,
      );
      res.send(JSON.stringify(data, null, 2));
    }
  }
}
