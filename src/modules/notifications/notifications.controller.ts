import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
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
import { NotificationsService } from './notifications.service';
import { NotificationFiltersDto } from './dto/notification-filters.dto';
import { MarkNotificationsAsReadDto } from './dto/mark-as-read.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Получить список уведомлений' })
  @ApiResponse({ status: 200, description: 'Список уведомлений' })
  findAll(@CurrentUser() user: any, @Query() filters: NotificationFiltersDto) {
    return this.notificationsService.findAll(user.id, filters);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Получить количество непрочитанных уведомлений' })
  @ApiResponse({ status: 200, description: 'Количество непрочитанных' })
  async getUnreadCount(@CurrentUser() user: any) {
    const count = await this.notificationsService.getUnreadCount(user.id);
    return { count };
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Отметить уведомление как прочитанное' })
  @ApiResponse({ status: 200, description: 'Уведомление отмечено как прочитанное' })
  @ApiResponse({ status: 404, description: 'Уведомление не найдено' })
  markAsRead(@Param('id') id: string, @CurrentUser() user: any) {
    return this.notificationsService.markAsRead(id, user.id);
  }

  @Post('mark-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Отметить несколько уведомлений как прочитанные' })
  @ApiResponse({ status: 200, description: 'Уведомления отмечены как прочитанные' })
  markMultipleAsRead(
    @CurrentUser() user: any,
    @Body() dto: MarkNotificationsAsReadDto,
  ) {
    if (dto.notificationIds && dto.notificationIds.length > 0) {
      return this.notificationsService.markMultipleAsRead(
        dto.notificationIds,
        user.id,
      );
    }
    return { updated: 0 };
  }

  @Post('mark-all-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Отметить все уведомления как прочитанные' })
  @ApiResponse({ status: 200, description: 'Все уведомления отмечены как прочитанные' })
  markAllAsRead(@CurrentUser() user: any) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Удалить уведомление' })
  @ApiResponse({ status: 200, description: 'Уведомление удалено' })
  @ApiResponse({ status: 404, description: 'Уведомление не найдено' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.notificationsService.delete(id, user.id);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Удалить все уведомления' })
  @ApiResponse({ status: 200, description: 'Все уведомления удалены' })
  removeAll(@CurrentUser() user: any) {
    return this.notificationsService.deleteAll(user.id);
  }
}
