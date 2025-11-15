import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
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
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { MarkAsReadDto } from './dto/mark-as-read.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tickets/:ticketId/messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @ApiOperation({ summary: 'Отправить сообщение в заявку' })
  @ApiResponse({ status: 201, description: 'Сообщение успешно отправлено' })
  @ApiResponse({ status: 404, description: 'Заявка не найдена' })
  create(
    @Param('ticketId') ticketId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateMessageDto,
  ) {
    return this.messagesService.create(ticketId, user.id, user.role, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить все сообщения заявки' })
  @ApiResponse({ status: 200, description: 'Список сообщений' })
  findAll(@Param('ticketId') ticketId: string, @CurrentUser() user: any) {
    return this.messagesService.findAll(ticketId, user.id, user.role);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Получить количество непрочитанных сообщений' })
  @ApiResponse({ status: 200, description: 'Количество непрочитанных' })
  getUnreadCount(@Param('ticketId') ticketId: string, @CurrentUser() user: any) {
    return this.messagesService.getUnreadCount(ticketId, user.id);
  }

  @Patch(':messageId/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Отметить сообщение как прочитанное' })
  @ApiResponse({ status: 200, description: 'Сообщение отмечено как прочитанное' })
  markAsRead(@Param('messageId') messageId: string, @CurrentUser() user: any) {
    return this.messagesService.markAsRead(messageId, user.id);
  }

  @Post('mark-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Отметить несколько сообщений как прочитанные' })
  @ApiResponse({ status: 200, description: 'Сообщения отмечены как прочитанные' })
  markMultipleAsRead(
    @Param('ticketId') ticketId: string,
    @CurrentUser() user: any,
    @Body() dto: MarkAsReadDto,
  ) {
    return this.messagesService.markMultipleAsRead(dto.messageIds, user.id);
  }
}
