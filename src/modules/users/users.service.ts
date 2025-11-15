// src/modules/users/users.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserFiltersDto } from './dto/user-filter.dto'
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    // Проверяем, существует ли пользователь
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }

    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Создаём пользователя
    const user = await this.prisma.user.create({
        data: {
            email: dto.email,
            password: hashedPassword,
            firstName: dto.firstName,
            lastName: dto.lastName,
            phone: dto.phone,
            role: dto.role,
            // Создаём профиль в зависимости от роли
            ...(dto.role === UserRole.CLIENT && {
            clientProfile: {
                create: {},
            },
            }),
            ...((dto.role === UserRole.OPERATOR || dto.role === UserRole.SPECIALIST) && {
            operatorStats: {
                create: {},
            },
            }),
        },
        include: {
            clientProfile: true,
            operatorStats: true,
        },
        });

    return this.sanitizeUser(user);
  }

  async findAll(filters: UserFiltersDto) {
    const where: any = {};

    // Фильтр по роли
    if (filters.role) {
      where.role = filters.role;
    }

    // Фильтр по статусу активности
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    // Поиск по имени, фамилии или email
    if (filters.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Пагинация
    const skip = (filters.page - 1) * filters.limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: filters.limit,
        include: {
          clientProfile: true,
          operatorStats: true,
          _count: {
            select: {
              clientTickets: true,
              operatorTickets: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map((user) => this.sanitizeUser(user)),
      meta: {
        total,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        clientProfile: true,
        operatorStats: true,
        _count: {
          select: {
            clientTickets: true,
            operatorTickets: true,
            messages: true,
            notifications: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    return this.sanitizeUser(user);
  }

  async findByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        clientProfile: true,
        operatorStats: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    return this.sanitizeUser(user);
  }

  async update(id: string, dto: UpdateUserDto) {
    // Проверяем, существует ли пользователь
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    // Обновляем пользователя
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        avatar: dto.avatar,
      },
      include: {
        clientProfile: true,
        operatorStats: true,
      },
    });

    return this.sanitizeUser(updatedUser);
  }

  async updateStatus(id: string, dto: UpdateUserStatusDto, currentUserId: string) {
    // Проверяем, существует ли пользователь
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    // Нельзя деактивировать самого себя
    if (id === currentUserId && !dto.isActive) {
      throw new BadRequestException('Вы не можете деактивировать свой аккаунт');
    }

    // Обновляем статус
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        isActive: dto.isActive,
      },
      include: {
        clientProfile: true,
        operatorStats: true,
      },
    });

    return this.sanitizeUser(updatedUser);
  }

  async updateRole(id: string, dto: UpdateUserRoleDto, currentUserId: string) {
    // Проверяем, существует ли пользователь
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        clientProfile: true,
        operatorStats: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    // Нельзя изменить роль самому себе
    if (id === currentUserId) {
      throw new BadRequestException('Вы не можете изменить свою роль');
    }

    // Обновляем роль и создаём/удаляем профили
    const updatedUser = await this.prisma.user.update({
        where: { id },
        data: {
            role: dto.role,
            // Создаём clientProfile если роль CLIENT и его нет
            ...(dto.role === UserRole.CLIENT &&
            !user.clientProfile && {
                clientProfile: {
                create: {},
                },
            }),
            // Создаём operatorStats если роль OPERATOR/SPECIALIST и его нет
            ...((dto.role === UserRole.OPERATOR || dto.role === UserRole.SPECIALIST) &&
            !user.operatorStats && {
                operatorStats: {
                create: {},
                },
            }),
        },
        include: {
            clientProfile: true,
            operatorStats: true,
        },
    });


    return this.sanitizeUser(updatedUser);
  }

  async changePassword(id: string, dto: ChangePasswordDto) {
    // Получаем пользователя с паролем
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    // Проверяем текущий пароль
    const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.password);

    if (!isPasswordValid) {
      throw new BadRequestException('Неверный текущий пароль');
    }

    // Хешируем новый пароль
    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    // Обновляем пароль
    await this.prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
      },
    });

    // Удаляем все refresh токены (разлогиниваем везде)
    await this.prisma.refreshToken.deleteMany({
      where: { userId: id },
    });

    return { message: 'Пароль успешно изменён' };
  }

  async remove(id: string, currentUserId: string) {
    // Проверяем, существует ли пользователь
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    // Нельзя удалить самого себя
    if (id === currentUserId) {
      throw new BadRequestException('Вы не можете удалить свой аккаунт');
    }

    // Удаляем пользователя (каскадное удаление настроено в Prisma)
    await this.prisma.user.delete({
      where: { id },
    });

    return { message: 'Пользователь успешно удалён' };
  }

  async getOperators() {
    const operators = await this.prisma.user.findMany({
      where: {
        role: {
          in: [UserRole.OPERATOR, UserRole.SPECIALIST],
        },
        isActive: true,
      },
      include: {
        operatorStats: true,
        _count: {
          select: {
            operatorTickets: {
              where: {
                status: {
                  in: ['NEW', 'IN_PROGRESS'],
                },
              },
            },
          },
        },
      },
      orderBy: {
        operatorStats: {
          averageRating: 'desc',
        },
      },
    });

    return operators.map((operator) => ({
      ...this.sanitizeUser(operator),
      activeTicketsCount: operator._count.operatorTickets,
    }));
  }

  async getOperatorStats(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        operatorStats: true,
        operatorTickets: {
          where: {
            status: 'RESOLVED',
          },
          include: {
            rating: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    if (user.role !== UserRole.OPERATOR && user.role !== UserRole.SPECIALIST) {
  throw new BadRequestException('Пользователь не является оператором');
}

    const stats = user.operatorStats;
    const tickets = user.operatorTickets;

    // Вычисляем дополнительную статистику
    const ratingDistribution = {
      5: tickets.filter((t) => t.rating?.rating === 5).length,
      4: tickets.filter((t) => t.rating?.rating === 4).length,
      3: tickets.filter((t) => t.rating?.rating === 3).length,
      2: tickets.filter((t) => t.rating?.rating === 2).length,
      1: tickets.filter((t) => t.rating?.rating === 1).length,
    };

    return {
      user: this.sanitizeUser(user),
      stats: {
        totalResolved: stats.totalResolved,
        averageResolutionTime: stats.averageResolutionTime,
        averageRating: stats.averageRating,
        totalRatings: stats.totalRatings,
        ratingDistribution,
      },
    };
  }

  private sanitizeUser(user: any) {
    const { password, ...sanitized } = user;
    return sanitized;
  }
}
