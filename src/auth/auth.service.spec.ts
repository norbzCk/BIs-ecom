import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtService } from '@nestjs/jwt';

function buildUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 1n,
    firstName: 'Sarah',
    lastName: 'Mitchell',
    email: 'sarah@archtech.io',
    passwordHash: bcrypt.hashSync('correct-horse-battery-staple', 4),
    phone: null,
    role: 'CUSTOMER' as const,
    status: 'ACTIVE' as const,
    ...overrides,
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: {
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      findUniqueOrThrow: ReturnType<typeof vi.fn>;
    };
  };
  let jwtService: { signAsync: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        findUniqueOrThrow: vi.fn(),
      },
    };
    jwtService = { signAsync: vi.fn().mockResolvedValue('signed.jwt.token') };

    service = new AuthService(
      prisma as unknown as PrismaService,
      jwtService as unknown as JwtService,
    );
  });

  describe('register', () => {
    it('creates a user and returns an access token without the password hash', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(buildUser());

      const result = await service.register({
        firstName: 'Sarah',
        lastName: 'Mitchell',
        email: 'sarah@archtech.io',
        password: 'correct-horse-battery-staple',
      });

      expect(result).toEqual({
        accessToken: 'signed.jwt.token',
        user: {
          id: '1',
          firstName: 'Sarah',
          lastName: 'Mitchell',
          email: 'sarah@archtech.io',
          phone: null,
          role: 'CUSTOMER',
        },
      });
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ cart: { create: {} } }),
        }),
      );
    });

    it('rejects a duplicate email', async () => {
      prisma.user.findUnique.mockResolvedValue(buildUser());

      await expect(
        service.register({
          firstName: 'Sarah',
          lastName: 'Mitchell',
          email: 'sarah@archtech.io',
          password: 'correct-horse-battery-staple',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('signs in with the correct password', async () => {
      prisma.user.findUnique.mockResolvedValue(buildUser());

      const result = await service.login({
        email: 'sarah@archtech.io',
        password: 'correct-horse-battery-staple',
      });

      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.user.email).toBe('sarah@archtech.io');
    });

    it('rejects an unknown email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@example.com', password: 'whatever' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects an incorrect password', async () => {
      prisma.user.findUnique.mockResolvedValue(buildUser());

      await expect(
        service.login({ email: 'sarah@archtech.io', password: 'wrong-password' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects a suspended account even with the correct password', async () => {
      prisma.user.findUnique.mockResolvedValue(buildUser({ status: 'SUSPENDED' }));

      await expect(
        service.login({
          email: 'sarah@archtech.io',
          password: 'correct-horse-battery-staple',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('me', () => {
    it('returns the public profile for the token subject', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue(buildUser());

      const result = await service.me({
        sub: '1',
        email: 'sarah@archtech.io',
        role: 'CUSTOMER',
      });

      expect(result).toEqual({
        id: '1',
        firstName: 'Sarah',
        lastName: 'Mitchell',
        email: 'sarah@archtech.io',
        phone: null,
        role: 'CUSTOMER',
      });
    });
  });
});
