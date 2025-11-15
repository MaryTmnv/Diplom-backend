import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient();
      const token = this.extractToken(client);

      if (!token) {
        throw new WsException('Unauthorized');
      }

      const payload = this.jwtService.verify(token);
      client.data.user = payload;

      return true;
    } catch (error) {
      throw new WsException('Unauthorized');
    }
  }

  private extractToken(client: Socket): string | null {
    // Токен может быть передан через:
    // 1. Handshake auth
    const authToken = client.handshake?.auth?.token;
    if (authToken) return authToken;

    // 2. Query параметры
    const queryToken = client.handshake?.query?.token;
    if (queryToken && typeof queryToken === 'string') return queryToken;

    // 3. Headers
    const headerToken = client.handshake?.headers?.authorization;
    if (headerToken) {
      return headerToken.replace('Bearer ', '');
    }

    return null;
  }
}
