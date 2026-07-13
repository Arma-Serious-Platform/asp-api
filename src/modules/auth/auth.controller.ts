import { Controller, Delete, Get, Post, Body, Param, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { SessionLoginDto } from './dto/session-login.dto';
import { VerifyTwoFactorDto } from './dto/verify-two-factor.dto';
import { AuthGuard } from 'src/shared/guards/auth.guard';
import { RequestType } from 'src/utils/types';

@Controller('auth/session')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(
    @Body() dto: SessionLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.sessionLogin(dto, req, res);
  }

  @Post('verify-2fa')
  verifyTwoFactor(
    @Body() dto: VerifyTwoFactorDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.verifySessionTwoFactor(dto, req, res);
  }

  @Post('logout')
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.authService.sessionLogout(req, res);
  }

  @Get()
  @UseGuards(AuthGuard)
  findActiveSessions(@Req() req: RequestType) {
    return this.authService.getActiveSessions(req.userId, req);
  }

  @Delete(':sessionId')
  @UseGuards(AuthGuard)
  revokeSession(
    @Param('sessionId') sessionId: string,
    @Req() req: RequestType,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.revokeSessionById(req.userId, sessionId, req, res);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() req: Request) {
    return this.authService.getSessionUser(req);
  }
}
