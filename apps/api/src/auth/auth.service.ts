import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  GlobalRole,
  SubscriptionPlan,
  SubscriptionStatus,
  TenantRole,
} from '@prisma/client';
import argon2 from 'argon2';
import type { StringValue } from 'ms';
import { randomBytes } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';

type RequestMeta = {
  ipAddress?: string;
  userAgent?: string;
};

type JwtPayload = {
  sub: string;
  email: string;
  globalRole: GlobalRole;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly auditService: AuditService,
  ) {}

  async register(input: RegisterDto, meta?: RequestMeta) {
    const email = input.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await argon2.hash(input.password);
    const tenantName = input.tenantName ?? `${input.name}'s Workspace`;
    const tenantSlug = await this.generateUniqueTenantSlug(tenantName);

    const { user, tenant, membership } = await this.prisma.$transaction(
      async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email,
            passwordHash,
            name: input.name,
          },
        });

        const newTenant = await tx.tenant.create({
          data: {
            name: tenantName,
            slug: tenantSlug,
          },
        });

        const newMembership = await tx.membership.create({
          data: {
            userId: newUser.id,
            tenantId: newTenant.id,
            role: TenantRole.OWNER,
          },
        });

        await tx.subscription.create({
          data: {
            tenantId: newTenant.id,
            plan: SubscriptionPlan.STARTER,
            status: SubscriptionStatus.TRIALING,
            seats: 5,
          },
        });

        return {
          user: newUser,
          tenant: newTenant,
          membership: newMembership,
        };
      },
    );

    await this.auditService.log({
      actorId: user.id,
      tenantId: tenant.id,
      action: 'auth.register',
      entityType: 'User',
      entityId: user.id,
      metadata: {
        email,
      },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    await this.emailService.queueWelcomeEmail({
      to: user.email,
      name: user.name,
      tenantName: tenant.name,
    });

    const tokens = await this.issueTokens({
      id: user.id,
      email: user.email,
      globalRole: user.globalRole,
    });

    return {
      user: this.sanitizeUser(user),
      tenant,
      membership,
      ...tokens,
    };
  }

  async login(input: LoginDto, meta?: RequestMeta) {
    const email = input.email.toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: {
            tenant: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isValidPassword = await argon2.verify(
      user.passwordHash,
      input.password,
    );
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.issueTokens({
      id: user.id,
      email: user.email,
      globalRole: user.globalRole,
    });

    await this.auditService.log({
      actorId: user.id,
      action: 'auth.login',
      metadata: {
        email: user.email,
      },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return {
      user: this.sanitizeUser(user),
      memberships: user.memberships,
      ...tokens,
    };
  }

  async refresh(input: RefreshTokenDto, meta?: RequestMeta) {
    const payload = await this.verifyRefreshToken(input.refreshToken);
    const activeToken = await this.findActiveRefreshToken(
      payload.sub,
      input.refreshToken,
    );
    if (!activeToken) {
      throw new UnauthorizedException('Refresh token revoked');
    }

    await this.prisma.refreshToken.update({
      where: { id: activeToken.id },
      data: { revokedAt: new Date() },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const tokens = await this.issueTokens({
      id: user.id,
      email: user.email,
      globalRole: user.globalRole,
    });

    await this.auditService.log({
      actorId: user.id,
      action: 'auth.refresh',
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return tokens;
  }

  async logout(
    input: RefreshTokenDto,
    meta?: RequestMeta,
  ): Promise<{ success: true }> {
    const payload = await this.verifyRefreshToken(input.refreshToken);
    const activeToken = await this.findActiveRefreshToken(
      payload.sub,
      input.refreshToken,
    );

    if (activeToken) {
      await this.prisma.refreshToken.update({
        where: { id: activeToken.id },
        data: { revokedAt: new Date() },
      });

      await this.auditService.log({
        actorId: payload.sub,
        action: 'auth.logout',
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      });
    }

    return { success: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            tenant: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      user: this.sanitizeUser(user),
      memberships: user.memberships,
    };
  }

  private async issueTokens(user: {
    id: string;
    email: string;
    globalRole: GlobalRole;
  }) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      globalRole: user.globalRole,
    };

    const accessExpiresIn = this.configService.get<string>(
      'JWT_ACCESS_EXPIRES_IN',
      '15m',
    ) as StringValue;
    const refreshExpiresIn = this.configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
      '7d',
    ) as StringValue;

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: accessExpiresIn,
    });

    const refreshToken = await this.jwtService.signAsync(
      {
        ...payload,
        nonce: randomBytes(12).toString('hex'),
      },
      {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshExpiresIn,
      },
    );

    const refreshTokenHash = await argon2.hash(refreshToken);
    const refreshTokenExp = this.getRefreshExpiryDate(refreshToken);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshTokenHash,
        expiresAt: refreshTokenExp,
      },
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
    };
  }

  private async verifyRefreshToken(token: string): Promise<JwtPayload> {
    try {
      return await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async findActiveRefreshToken(userId: string, rawToken: string) {
    const tokens = await this.prisma.refreshToken.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    for (const token of tokens) {
      const match = await argon2.verify(token.tokenHash, rawToken);
      if (match) {
        return token;
      }
    }

    return null;
  }

  private getRefreshExpiryDate(refreshToken: string): Date {
    const decoded: unknown = this.jwtService.decode(refreshToken);
    if (!decoded || typeof decoded !== 'object' || !('exp' in decoded)) {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }

    const exp = (decoded as { exp?: unknown }).exp;
    if (typeof exp === 'number') {
      return new Date(exp * 1000);
    }

    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  private async generateUniqueTenantSlug(name: string): Promise<string> {
    const base = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);

    let candidate = base || 'workspace';
    let counter = 1;

    while (true) {
      const exists = await this.prisma.tenant.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });

      if (!exists) {
        return candidate;
      }

      counter += 1;
      candidate = `${base}-${counter}`;
    }
  }

  private sanitizeUser<T extends { passwordHash?: string }>(
    user: T,
  ): Omit<T, 'passwordHash'> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...rest } = user;
    return rest;
  }
}
