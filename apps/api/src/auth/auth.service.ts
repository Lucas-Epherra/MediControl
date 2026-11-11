import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { isUniqueViolation } from '../common/prisma-exception.filter';
import type { AuthUser } from '../common/request-context';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './auth.dto';

export interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    try {
      const user = await this.prisma.user.create({
        data: { email: dto.email, name: dto.name.trim(), passwordHash },
      });
      return this.session(user);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Ya existe una cuenta con ese email');
      }
      throw error;
    }
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    const valid = user && (await bcrypt.compare(dto.password, user.passwordHash));
    if (!valid) {
      throw new UnauthorizedException('Email o contraseña incorrectos');
    }
    return this.session(user);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return toAuthUser(user);
  }

  private async session(user: User) {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    return { accessToken: await this.jwt.signAsync(payload), user: toAuthUser(user) };
  }
}

export function toAuthUser(user: Pick<User, 'id' | 'email' | 'name'>): AuthUser {
  return { id: user.id, email: user.email, name: user.name };
}
