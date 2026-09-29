import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { TwoFactorService } from './two-factor.service';
import { AuthGuard } from 'src/shared/guards/auth.guard';
import { RequestType } from 'src/utils/types';
import { EnableTwoFactorDto } from './dto/enable-two-factor.dto';
import { DisableTwoFactorDto } from './dto/disable-two-factor.dto';
import { RateLimit } from 'src/shared/decorators/rate-limit.decorator';
import { RateLimitGuard } from 'src/shared/guards/rate-limit.guard';
import {
  PASSWORD_CONFIRMATION_RATE_LIMITS,
  TWO_FACTOR_ENABLE_RATE_LIMITS,
} from './auth-rate-limits';

@Controller('auth/2fa')
export class TwoFactorController {
  constructor(private readonly twoFactorService: TwoFactorService) {}

  @Get('status')
  @UseGuards(AuthGuard)
  getStatus(@Req() req: RequestType) {
    return this.twoFactorService.getStatus(req.userId);
  }

  @Post('setup')
  @UseGuards(AuthGuard)
  setup(@Req() req: RequestType) {
    return this.twoFactorService.setup(req.userId);
  }

  @Post('enable')
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(TWO_FACTOR_ENABLE_RATE_LIMITS)
  enable(@Req() req: RequestType, @Body() dto: EnableTwoFactorDto) {
    return this.twoFactorService.enable(req.userId, dto.code);
  }

  @Post('disable')
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(PASSWORD_CONFIRMATION_RATE_LIMITS)
  disable(@Req() req: RequestType, @Body() dto: DisableTwoFactorDto) {
    return this.twoFactorService.disable(req.userId, dto);
  }
}
