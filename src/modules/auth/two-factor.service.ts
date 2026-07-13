import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { generateSecret, generateURI, verify } from 'otplib';
import * as QRCode from 'qrcode';
import { randomBytes } from 'crypto';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import {
  TWO_FACTOR_ISSUER,
  TWO_FACTOR_LOGIN_TOKEN_EXPIRES_IN,
  TWO_FACTOR_LOGIN_TOKEN_PURPOSE,
  TWO_FACTOR_MAX_VERIFY_ATTEMPTS,
  TWO_FACTOR_PENDING_TTL_MS,
  TWO_FACTOR_RECOVERY_CODE_COUNT,
  TWO_FACTOR_VERIFY_WINDOW_MS,
} from './auth-two-factor.constants';
import { DisableTwoFactorDto } from './dto/disable-two-factor.dto';
import {
  decryptTwoFactorSecret,
  encryptTwoFactorSecret,
} from './utils/two-factor-crypto';

type VerifyAttemptState = {
  count: number;
  resetAt: number;
};

@Injectable()
export class TwoFactorService {
  private readonly verifyAttempts = new Map<string, VerifyAttemptState>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async getStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true },
    });

    return { enabled: Boolean(user?.twoFactorEnabled) };
  }

  async createLoginToken(userId: string) {
    return this.jwtService.signAsync(
      { userId, purpose: TWO_FACTOR_LOGIN_TOKEN_PURPOSE },
      {
        secret: process.env.JWT_SECRET,
        expiresIn: TWO_FACTOR_LOGIN_TOKEN_EXPIRES_IN,
      },
    );
  }

  async verifyLoginToken(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync<{
        userId?: string;
        purpose?: string;
      }>(token, { secret: process.env.JWT_SECRET });

      if (
        !payload.userId ||
        payload.purpose !== TWO_FACTOR_LOGIN_TOKEN_PURPOSE
      ) {
        throw new UnauthorizedException('Invalid two-factor token');
      }

      return payload.userId;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Invalid or expired two-factor token');
    }
  }

  async isTwoFactorEnabled(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true },
    });

    return Boolean(user?.twoFactorEnabled);
  }

  private assertVerifyAttemptsAllowed(userId: string) {
    const now = Date.now();
    const state = this.verifyAttempts.get(userId);

    if (!state || state.resetAt <= now) {
      this.verifyAttempts.set(userId, {
        count: 0,
        resetAt: now + TWO_FACTOR_VERIFY_WINDOW_MS,
      });
      return;
    }

    if (state.count >= TWO_FACTOR_MAX_VERIFY_ATTEMPTS) {
      throw new UnauthorizedException(
        'Too many failed verification attempts. Try again later.',
      );
    }
  }

  private recordFailedVerifyAttempt(userId: string) {
    const now = Date.now();
    const state = this.verifyAttempts.get(userId);

    if (!state || state.resetAt <= now) {
      this.verifyAttempts.set(userId, {
        count: 1,
        resetAt: now + TWO_FACTOR_VERIFY_WINDOW_MS,
      });
      return;
    }

    state.count += 1;
    this.verifyAttempts.set(userId, state);
  }

  private clearVerifyAttempts(userId: string) {
    this.verifyAttempts.delete(userId);
  }

  private normalizeRecoveryCode(code: string) {
    return code.trim().toUpperCase().replace(/\s+/g, '');
  }

  private generateRecoveryCode() {
    const bytes = randomBytes(4);
    const value = bytes.toString('hex').toUpperCase();
    return `${value.slice(0, 4)}-${value.slice(4, 8)}`;
  }

  private async verifyTotpCode(secret: string, code: string) {
    const result = await verify({ secret, token: code });
    return result.valid;
  }

  private async getUserSecret(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, twoFactorEnabled: true },
    });

    if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }

    return decryptTwoFactorSecret(user.twoFactorSecret);
  }

  private async clearPendingSecret(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorPendingSecret: null,
        twoFactorPendingSecretAt: null,
      },
    });
  }

  private async getPendingSecret(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        twoFactorPendingSecret: true,
        twoFactorPendingSecretAt: true,
        twoFactorEnabled: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException('Two-factor authentication is already enabled');
    }

    if (!user.twoFactorPendingSecret || !user.twoFactorPendingSecretAt) {
      throw new BadRequestException('Two-factor setup has not been started');
    }

    if (
      user.twoFactorPendingSecretAt.getTime() + TWO_FACTOR_PENDING_TTL_MS <
      Date.now()
    ) {
      await this.clearPendingSecret(userId);
      throw new BadRequestException(
        'Two-factor setup expired. Please start again.',
      );
    }

    return decryptTwoFactorSecret(user.twoFactorPendingSecret);
  }

  async setup(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        nickname: true,
        twoFactorEnabled: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException('Two-factor authentication is already enabled');
    }

    const secret = generateSecret();
    const otpauthUrl = generateURI({
      issuer: TWO_FACTOR_ISSUER,
      label: user.email,
      secret,
    });
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorPendingSecret: encryptTwoFactorSecret(secret),
        twoFactorPendingSecretAt: new Date(),
      },
    });

    return {
      otpauthUrl,
      qrCodeDataUrl,
      secret,
    };
  }

  async enable(userId: string, code: string) {
    const pendingSecret = await this.getPendingSecret(userId);
    const isValid = await this.verifyTotpCode(pendingSecret, code);

    if (!isValid) {
      throw new BadRequestException('Invalid authentication code');
    }

    const recoveryCodes = Array.from(
      { length: TWO_FACTOR_RECOVERY_CODE_COUNT },
      () => this.generateRecoveryCode(),
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: true,
          twoFactorSecret: encryptTwoFactorSecret(pendingSecret),
          twoFactorPendingSecret: null,
          twoFactorPendingSecretAt: null,
        },
      });

      await tx.userTwoFactorRecoveryCode.deleteMany({
        where: { userId },
      });

      for (const recoveryCode of recoveryCodes) {
        await tx.userTwoFactorRecoveryCode.create({
          data: {
            userId,
            codeHash: await hash(this.normalizeRecoveryCode(recoveryCode), 10),
          },
        });
      }
    });

    return { recoveryCodes };
  }

  async disable(userId: string, dto: DisableTwoFactorDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        password: true,
        twoFactorEnabled: true,
      },
    });

    if (!user?.twoFactorEnabled) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }

    const isPasswordValid = await compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    const verified = await this.verifyUserCodeOrRecovery(
      userId,
      dto.code,
      dto.recoveryCode,
    );

    if (!verified) {
      throw new UnauthorizedException('Invalid authentication code');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: false,
          twoFactorSecret: null,
          twoFactorPendingSecret: null,
          twoFactorPendingSecretAt: null,
        },
      });

      await tx.userTwoFactorRecoveryCode.deleteMany({
        where: { userId },
      });
    });

    return { message: 'Two-factor authentication disabled' };
  }

  async verifyUserCodeOrRecovery(
    userId: string,
    code?: string,
    recoveryCode?: string,
  ) {
    if (!code && !recoveryCode) {
      throw new BadRequestException(
        'Authentication code or recovery code is required',
      );
    }

    this.assertVerifyAttemptsAllowed(userId);

    if (code) {
      const secret = await this.getUserSecret(userId);
      const isValid = await this.verifyTotpCode(secret, code);

      if (!isValid) {
        this.recordFailedVerifyAttempt(userId);
        return false;
      }

      this.clearVerifyAttempts(userId);
      return true;
    }

    const normalizedRecoveryCode = this.normalizeRecoveryCode(recoveryCode!);
    const recoveryCodes = await this.prisma.userTwoFactorRecoveryCode.findMany({
      where: {
        userId,
        usedAt: null,
      },
    });

    for (const entry of recoveryCodes) {
      const matches = await compare(normalizedRecoveryCode, entry.codeHash);

      if (!matches) {
        continue;
      }

      await this.prisma.userTwoFactorRecoveryCode.update({
        where: { id: entry.id },
        data: { usedAt: new Date() },
      });

      this.clearVerifyAttempts(userId);
      return true;
    }

    this.recordFailedVerifyAttempt(userId);
    return false;
  }
}
