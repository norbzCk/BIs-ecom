import type { Request } from 'express';

export interface JwtPayload {
  sub: string; // user id, as a string (BigInt-safe)
  email: string;
  role: 'CUSTOMER' | 'ADMIN';
}

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}
