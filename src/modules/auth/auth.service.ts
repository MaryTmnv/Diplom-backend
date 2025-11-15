// src/modules/auth/auth.service.ts
import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponse, TokenResponse } from './interfaces/auth-response.interface';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    // 1. Проверяем, существует ли пользователь
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }

    // 2. Хешируем пароль
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // 3. Создаём пользователя
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: UserRole.CLIENT,
        clientProfile: {
          create: {},
        },
      },
      include: {
        clientProfile: true,
      },
    });

    // 4. Генерируем токены
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // 5. Сохраняем refresh token
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    // 6. Возвращаем ответ
    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    // 1. Находим пользователя
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        clientProfile: true,
        operatorStats: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    // 2. Проверяем пароль
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    // 3. Проверяем активность
    if (!user.isActive) {
      throw new UnauthorizedException('Аккаунт заблокирован');
    }

    // 4. Генерируем токены
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // 5. Сохраняем refresh token
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    // 6. Возвращаем ответ
    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async refreshTokens(refreshToken: string): Promise<TokenResponse> {
    // 1. Проверяем токен в БД
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Невалидный refresh token');
    }

    // 2. Проверяем срок действия
    if (storedToken.expiresAt < new Date()) {
      await this.prisma.refreshToken.delete({ where: { id: storedToken.id } });
      throw new UnauthorizedException('Refresh token истёк');
    }

    // 3. Получаем пользователя
    const user = await this.prisma.user.findUnique({
      where: { id: storedToken.userId },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Пользователь не найден или заблокирован');
    }

    // 4. Генерируем новые токены
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // 5. Удаляем старый refresh token и сохраняем новый
    await this.prisma.refreshToken.delete({ where: { id: storedToken.id } });
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: {
        userId,
        token: refreshToken,
      },
    });
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Не раскрываем, существует ли пользователь
      return;
    }

    // Генерируем токен для сброса пароля (действителен 1 час)
    const resetToken = this.jwtService.sign(
      { userId: user.id, type: 'password-reset' },
      { expiresIn: '1h' },
    );

    // TODO: Отправить email с ссылкой для сброса
    console.log(`Reset token for ${email}: ${resetToken}`);
    console.log(`Reset URL: ${this.configService.get('FRONTEND_URL')}/auth/reset-password?token=${resetToken}`);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      const payload = this.jwtService.verify(token);

      if (payload.type !== 'password-reset') {
        throw new UnauthorizedException('Невалидный токен');
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await this.prisma.user.update({
        where: { id: payload.userId },
        data: { password: hashedPassword },
      });

      // Удаляем все refresh токены пользователя (разлогиниваем везде)
      await this.prisma.refreshToken.deleteMany({
        where: { userId: payload.userId },
      });
    } catch (error) {
      throw new UnauthorizedException('Невалидный или истёкший токен');
    }
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, ...result } = user;
      return result;
    }

    return null;
  }

  private async generateTokens(
    userId: string,
    email: string,
    role: UserRole,
  ): Promise<TokenResponse> {
    const payload: JwtPayload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: this.configService.get('JWT_EXPIRES_IN') || '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN') || '7d',
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 минут в секундах
    };
  }

  private async saveRefreshToken(userId: string, token: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 дней

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });
  }

  private sanitizeUser(user: any) {
    const { password, ...sanitized } = user;
    return sanitized;
  }
}
