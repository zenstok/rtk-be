import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as crypto from 'crypto';
import { AuthRefreshToken } from './entities/auth-refresh-token.entity';
import { User } from '../user/entities/user.entity';

@Injectable()
export class AuthRefreshTokenService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(AuthRefreshToken)
    private readonly authRefreshTokenRepository: Repository<AuthRefreshToken>,
    private readonly configService: ConfigService,
  ) {}

  async generateRefreshToken(
    userId: number,
    currentRefreshToken?: string,
    currentRefreshTokenExpiresAt?: Date,
  ): Promise<string> {
    const newRefreshToken = this.jwtService.sign(
      { sub: userId },
      {
        secret: this.configService.get(
          'JWT_REFRESH_SECRET',
          'rtk-dev-jwt-refresh-secret-do-not-use-in-production',
        ),
        expiresIn: '30d',
      },
    );

    if (currentRefreshToken && currentRefreshTokenExpiresAt) {
      const hashedRefreshToken = crypto
        .createHash('sha256')
        .update(currentRefreshToken)
        .digest('base64');

      if (await this.isRefreshTokenBlackListed(hashedRefreshToken, userId)) {
        throw new UnauthorizedException('Invalid refresh token.');
      }

      await this.authRefreshTokenRepository.insert({
        hashedRefreshToken,
        expiresAt: currentRefreshTokenExpiresAt,
        userId,
      });
    }

    return newRefreshToken;
  }

  private isRefreshTokenBlackListed(
    hashedRefreshToken: string,
    userId: number,
  ): Promise<boolean> {
    return this.authRefreshTokenRepository.existsBy({
      hashedRefreshToken,
      userId,
    });
  }

  async generateTokenPair(
    user: User,
    currentRefreshToken?: string,
    currentRefreshTokenExpiresAt?: Date,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: user.id };
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: await this.generateRefreshToken(
        user.id,
        currentRefreshToken,
        currentRefreshTokenExpiresAt,
      ),
    };
  }

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async clearExpiredRefreshTokens(): Promise<void> {
    await this.authRefreshTokenRepository.delete({
      expiresAt: LessThanOrEqual(new Date()),
    });
  }
}
