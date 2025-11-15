export interface JwtPayload {
  sub: string;      // user id
  email: string;
  role: string;
  iat?: number;     // issued at
  exp?: number;     // expiration
}