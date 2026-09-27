import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import type { JwtPayload } from './jwt-payload.interface.js';

const SALT_ROUNDS = 12;

export interface PublicUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: 'CUSTOMER' | 'ADMIN';
}

export interface AuthResult {
  accessToken: string;
  user: PublicUser;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        passwordHash,
        phone: dto.phone,
        cart: { create: {} },
      },
    });

    return this.buildAuthResult(user);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    const passwordMatches = user
      ? await bcrypt.compare(dto.password, user.passwordHash)
      : false;

    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('This account is not active');
    }

    return this.buildAuthResult(user);
  }

  async me(payload: JwtPayload): Promise<PublicUser> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: BigInt(payload.sub) },
    });

    return this.toPublicUser(user);
  }

  private async buildAuthResult(user: {
    id: bigint;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    role: 'CUSTOMER' | 'ADMIN';
  }): Promise<AuthResult> {
    const publicUser = this.toPublicUser(user);

    const payload: JwtPayload = {
      sub: publicUser.id,
      email: publicUser.email,
      role: publicUser.role,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return { accessToken, user: publicUser };
  }

  private toPublicUser(user: {
    id: bigint;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    role: 'CUSTOMER' | 'ADMIN';
  }): PublicUser {
    return {
      id: user.id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
    };
  }
}
