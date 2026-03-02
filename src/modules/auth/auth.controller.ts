import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtRefreshAuthGuard } from './guards/jwt-refresh-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ConfirmResetPasswordDto } from './dto/confirm-reset-password.dto';
import { User } from '../user/entities/user.entity';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ short: { limit: 5, ttl: 1000 }, long: { limit: 10, ttl: 60000 } })
  @ApiBody({ type: LoginDto })
  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  login(@Req() req: Request) {
    return this.authService.login(req.user as User);
  }

  @ApiBearerAuth()
  @Get('me')
  me(@CurrentUser() user: User) {
    return user;
  }

  @Throttle({ short: { limit: 2, ttl: 1000 }, long: { limit: 5, ttl: 60000 } })
  @Public()
  @UseGuards(JwtRefreshAuthGuard)
  @Post('refresh-tokens')
  refreshTokens(@Req() req: Request) {
    const { attributes, refreshTokenExpiresAt } = req.user as {
      attributes: User;
      refreshTokenExpiresAt: Date;
    };
    const authHeader = req.headers.authorization as string | undefined;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new BadRequestException('Invalid authorization header format');
    }
    const currentRefreshToken = authHeader.substring(7);
    return this.authService.refreshTokens(
      attributes,
      currentRefreshToken,
      refreshTokenExpiresAt,
    );
  }

  @Throttle({ short: { limit: 1, ttl: 5000 }, long: { limit: 2, ttl: 30000 } })
  @Public()
  @Post('reset-password')
  sendResetPasswordConfirmation(@Body() dto: ResetPasswordDto) {
    return this.authService.sendResetPasswordConfirmation(dto);
  }

  @Throttle({ short: { limit: 1, ttl: 1000 }, long: { limit: 3, ttl: 60000 } })
  @Public()
  @Post('confirm-reset-password')
  resetPassword(@Body() dto: ConfirmResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
