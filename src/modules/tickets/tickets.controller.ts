// src/modules/tickets/tickets.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
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
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { UpdateTicketPriorityDto } from './dto/update-ticket-priority.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { EscalateTicketDto } from './dto/escalate-ticket.dto';
import { TicketFiltersDto } from './dto/ticket-filters.dto';
import { RateTicketDto } from './dto/rate-ticket.dto';
import { AddInternalNoteDto } from './dto/add-internal-note.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @ApiOperation({ summary: 'Создать новую заявку' })
  @ApiResponse({ status: 201, description: 'Заявка успешно создана' })
  @ApiResponse({ status: 400, description: 'Некорректные данные' })
  create(@CurrentUser() user: any, @Body() dto: CreateTicketDto) {
    return this.ticketsService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить список заявок' })
  @ApiResponse({ status: 200, description: 'Список заявок' })
  findAll(@CurrentUser() user: any, @Query() filters: TicketFiltersDto) {
    return this.ticketsService.findAll(user.id, user.role, filters);
  }

  @Get('queue')
  @Roles(UserRole.OPERATOR, UserRole.SPECIALIST, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Получить очередь заявок (не назначенные)' })
  @ApiResponse({ status: 200, description: 'Очередь заявок' })
  getQueue() {
    return this.ticketsService.getQueue();
  }

  @Get('my-active')
  @Roles(UserRole.OPERATOR, UserRole.SPECIALIST)
  @ApiOperation({ summary: 'Получить мои активные заявки' })
  @ApiResponse({ status: 200, description: 'Активные заявки оператора' })
  getMyActive(@CurrentUser() user: any) {
    return this.ticketsService.getMyActive(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить заявку по ID' })
  @ApiResponse({ status: 200, description: 'Детали заявки' })
  @ApiResponse({ status: 404, description: 'Заявка не найдена' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.ticketsService.findOne(id, user.id, user.role);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Получить историю изменений заявки' })
  @ApiResponse({ status: 200, description: 'История заявки' })
  getHistory(@Param('id') id: string) {
    return this.ticketsService.getHistory(id);
  }

  @Get(':id/suggestions')
  @Roles(UserRole.OPERATOR, UserRole.SPECIALIST, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Получить умные подсказки для заявки' })
  @ApiResponse({ status: 200, description: 'Подсказки' })
  getSuggestions(@Param('id') id: string) {
    return this.ticketsService.getSuggestions(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить заявку' })
  @ApiResponse({ status: 200, description: 'Заявка успешно обновлена' })
  @ApiResponse({ status: 404, description: 'Заявка не найдена' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateTicketDto,
  ) {
    return this.ticketsService.update(id, user.id, user.role, dto);
  }

  @Post(':id/assign')
  @Roles(UserRole.OPERATOR, UserRole.SPECIALIST, UserRole.MANAGER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Назначить заявку на оператора' })
  @ApiResponse({ status: 200, description: 'Заявка успешно назначена' })
  assignTicket(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: AssignTicketDto,
  ) {
    return this.ticketsService.assignTicket(id, user.id, dto);
  }

  @Patch(':id/status')
  @Roles(UserRole.OPERATOR, UserRole.SPECIALIST, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Изменить статус заявки' })
  @ApiResponse({ status: 200, description: 'Статус успешно изменён' })
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateTicketStatusDto,
  ) {
    return this.ticketsService.updateStatus(id, user.id, dto);
  }

  @Patch(':id/priority')
  @Roles(UserRole.OPERATOR, UserRole.SPECIALIST, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Изменить приоритет заявки' })
  @ApiResponse({ status: 200, description: 'Приоритет успешно изменён' })
  updatePriority(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateTicketPriorityDto,
  ) {
    return this.ticketsService.updatePriority(id, user.id, dto);
  }

  @Post(':id/escalate')
  @Roles(UserRole.OPERATOR, UserRole.MANAGER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Эскалировать заявку специалисту' })
  @ApiResponse({ status: 200, description: 'Заявка успешно эскалирована' })
  escalateTicket(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: EscalateTicketDto,
  ) {
    return this.ticketsService.escalateTicket(id, user.id, dto);
  }

  @Post(':id/notes')
  @Roles(UserRole.OPERATOR, UserRole.SPECIALIST, UserRole.MANAGER, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Добавить внутреннюю заметку' })
  @ApiResponse({ status: 201, description: 'Заметка успешно добавлена' })
  addInternalNote(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: AddInternalNoteDto,
  ) {
    return this.ticketsService.addInternalNote(id, user.id, dto);
  }

  @Post(':id/rate')
  @Roles(UserRole.CLIENT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Оценить заявку' })
  @ApiResponse({ status: 200, description: 'Оценка успешно добавлена' })
  @ApiResponse({ status: 400, description: 'Заявка уже оценена или не решена' })
  rateTicket(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: RateTicketDto,
  ) {
    return this.ticketsService.rateTicket(id, user.id, dto);
  }
}
