import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRepository } from '../../user/repositories/user.repository';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    private readonly userRepository: UserRepository,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get(
        'JWT_REFRESH_SECRET',
        'rtk-dev-jwt-refresh-secret-do-not-use-in-production',
      ),
    });
  }

  async validate(
    payload: { sub: number; exp: number },
  ): Promise<{ attributes: any; refreshTokenExpiresAt: Date }> {
    const user = await this.userRepository.findOneBy({ id: payload.sub });
    if (!user) {
      throw new UnauthorizedException();
    }
    return {
      attributes: user,
      refreshTokenExpiresAt: new Date(payload.exp * 1000),
    };
  }
}
