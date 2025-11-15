// src/modules/auth/interfaces/auth-response.interface.ts
export interface AuthResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    avatar?: string;
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
