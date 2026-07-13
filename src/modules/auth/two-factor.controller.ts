import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { TwoFactorService } from './two-factor.service';
import { AuthGuard } from 'src/shared/guards/auth.guard';
import { RequestType } from 'src/utils/types';
import { EnableTwoFactorDto } from './dto/enable-two-factor.dto';
import { DisableTwoFactorDto } from './dto/disable-two-factor.dto';

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
  @UseGuards(AuthGuard)
  enable(@Req() req: RequestType, @Body() dto: EnableTwoFactorDto) {
    return this.twoFactorService.enable(req.userId, dto.code);
  }

  @Post('disable')
  @UseGuards(AuthGuard)
  disable(@Req() req: RequestType, @Body() dto: DisableTwoFactorDto) {
    return this.twoFactorService.disable(req.userId, dto);
  }
}
