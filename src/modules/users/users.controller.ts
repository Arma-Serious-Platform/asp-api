import { Multer } from 'multer';
import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Delete,
  UseGuards,
  Req,
  UseInterceptors,
  Query,
  Patch,
  Res,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { SignUpDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { ChangeUserRoleDto } from './dto/change-user-role.dto';
import { ConfirmSignUpDto } from './dto/confirm-sign-up.dto';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { AuthGuard } from 'src/shared/guards/auth.guard';
import { OptionalAuthGuard } from 'src/shared/guards/optional-auth.guard';
import { BanUserDto } from './dto/ban-user.dto';
import { RequestType } from 'src/utils/types';
import { UnbanUserDto } from './dto/unban-user.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { GetUsersDto } from './dto/get-users.dto';
import { FileValidation } from 'src/shared/decorators/file.dectorator';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { VerifyTwoFactorDto } from 'src/modules/auth/dto/verify-two-factor.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { ChangeNicknameDto } from './dto/change-nickname.dto';
import { CreateUserWarningDto } from './dto/create-user-warning.dto';
import {
  OptionalPunishmentReasonDto,
  PunishmentReasonDto,
} from './dto/punishment-reason.dto';
import { BanPunishmentDto } from './dto/ban-punishment.dto';
import { Request, Response } from 'express';
import { StaticBearerTokenGuard } from 'src/shared/guards/static-bearer-token.guard';
import { getRequestIp } from 'src/shared/utils/request-ip';
import { SESSION_COOKIE_NAME } from 'src/modules/auth/auth.constants';
import { RateLimit } from 'src/shared/decorators/rate-limit.decorator';
import { RateLimitGuard } from 'src/shared/guards/rate-limit.guard';
import {
  FORGOT_PASSWORD_RATE_LIMITS,
  LOGIN_RATE_LIMITS,
  PASSWORD_CONFIRMATION_RATE_LIMITS,
  SIGN_UP_RATE_LIMITS,
  TOKEN_REDEMPTION_RATE_LIMITS,
  TWO_FACTOR_VERIFY_RATE_LIMITS,
} from 'src/modules/auth/auth-rate-limits';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Must be built the same way when redirecting to Steam and when verifying
  // the callback, because the OpenID return_to is checked against it.
  private getSteamCallbackUrl(req: Request) {
    return `${req.protocol}://${req.get('host')}/api/users/steam/callback`;
  }

  @Get()
  @UseGuards(AuthGuard)
  find(@Query() dto: GetUsersDto, @Req() req: RequestType) {
    return this.usersService.findAll(dto, req.roles);
  }

  @Get('/whitelist')
  @UseGuards(StaticBearerTokenGuard)
  findWhitelist() {
    return this.usersService.findWhitelist();
  }

  @Get('/me')
  @UseGuards(AuthGuard)
  me(@Req() req: RequestType) {
    return this.usersService.me(req.userId);
  }

  @Post('/login')
  @UseGuards(RateLimitGuard)
  @RateLimit(LOGIN_RATE_LIMITS)
  login(@Body() loginUserDto: LoginUserDto, @Req() req: Request) {
    return this.usersService.login(loginUserDto, getRequestIp(req));
  }

  @Post('/login/verify-2fa')
  @UseGuards(RateLimitGuard)
  @RateLimit(TWO_FACTOR_VERIFY_RATE_LIMITS)
  verifyTwoFactorLogin(@Body() dto: VerifyTwoFactorDto) {
    return this.usersService.verifyTwoFactorLogin(dto);
  }

  @Post('/refresh-token')
  refreshToken(@Body() dto: RefreshTokenDto) {
    return this.usersService.refreshToken(dto);
  }

  @Patch('/me')
  @UseGuards(AuthGuard)
  updateMe(@Body() updateMeDto: UpdateMeDto, @Req() req: RequestType) {
    return this.usersService.updateMe(req.userId, updateMeDto);
  }

  @Patch('me/change-nickname')
  @UseGuards(AuthGuard)
  changeNickname(@Body() dto: ChangeNicknameDto, @Req() req: RequestType) {
    return this.usersService.changeNickname(
      req.userId,
      dto,
      undefined,
      req.userId,
    );
  }

  @Delete('me/steamId')
  @UseGuards(AuthGuard)
  disconnectSteam(@Req() req: RequestType) {
    return this.usersService.disconnectSteam(req.userId);
  }

  @Get('/steam-login')
  @UseGuards(AuthGuard)
  async steamLogin(@Req() req: RequestType, @Res() res: Response) {
    const callbackUrl = this.getSteamCallbackUrl(req);
    const accessToken = await this.usersService.createSteamLinkToken(req.userId);
    const redirectUrl = this.usersService.getSteamLoginRedirectUrl(
      accessToken,
      callbackUrl,
    );

    return res.redirect(redirectUrl);
  }

  @Get('/steam/callback')
  async steamCallback(@Req() req: Request, @Res() res: Response) {
    const query = req.query as Record<string, string | string[] | undefined>;
    await this.usersService.linkSteamFromCallback(
      query,
      this.getSteamCallbackUrl(req),
    );

    return res.redirect(this.usersService.getFrontendSteamLinkedRedirectUrl());
  }

  @Post('/signup')
  @UseGuards(RateLimitGuard)
  @RateLimit(SIGN_UP_RATE_LIMITS)
  create(@Body() signUpDto: SignUpDto) {
    return this.usersService.signUp(signUpDto);
  }

  @Post('/sign-up/confirm')
  @UseGuards(RateLimitGuard)
  @RateLimit(TOKEN_REDEMPTION_RATE_LIMITS)
  confirmSignUp(@Body() confirmSignUpDto: ConfirmSignUpDto) {
    return this.usersService.confirmSignUp(confirmSignUpDto);
  }

  @Post('/forgot-password')
  @UseGuards(RateLimitGuard)
  @RateLimit(FORGOT_PASSWORD_RATE_LIMITS)
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.usersService.forgotPassword(forgotPasswordDto);
  }

  @Post('/reset-password')
  @UseGuards(RateLimitGuard)
  @RateLimit(TOKEN_REDEMPTION_RATE_LIMITS)
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.usersService.resetPassword(resetPasswordDto);
  }

  @Post('/change-password')
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit(PASSWORD_CONFIRMATION_RATE_LIMITS)
  changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @Req() req: RequestType,
  ) {
    return this.usersService.changePassword(
      changePasswordDto,
      req.userId,
      req.cookies?.[SESSION_COOKIE_NAME] as string | undefined,
    );
  }

  @Put('/change-role')
  @UseGuards(AuthGuard)
  @Roles(['OWNER'])
  changeUserRole(
    @Body() changeUserRoleDto: ChangeUserRoleDto,
    @Req() req: RequestType,
  ) {
    return this.usersService.changeUserRole(changeUserRoleDto, req.userId);
  }

  @Post('/change-avatar')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('avatar'))
  changeAvatar(@FileValidation() avatar: Multer.File, @Req() req: RequestType) {
    return this.usersService.changeAvatar(avatar, req.userId);
  }

  @Patch(':userId/nickname')
  @UseGuards(AuthGuard)
  @Roles(['OWNER', 'SERVER_ADMIN', 'GAME_ADMIN'])
  changeUserNickname(
    @Param('userId') userId: string,
    @Body() dto: ChangeNicknameDto,
    @Req() req: RequestType,
  ) {
    return this.usersService.changeNickname(
      userId,
      dto,
      req.roles,
      req.userId,
    );
  }

  @Post(':userId/warnings')
  @UseGuards(AuthGuard)
  @Roles(['OWNER', 'SERVER_ADMIN', 'GAME_ADMIN'])
  createWarning(
    @Param('userId') userId: string,
    @Body() dto: CreateUserWarningDto,
    @Req() req: RequestType,
  ) {
    return this.usersService.createWarning(userId, dto, req.userId, req.roles);
  }

  @Get(':userId/warnings')
  @UseGuards(AuthGuard)
  @Roles(['OWNER', 'SERVER_ADMIN', 'GAME_ADMIN'])
  findWarnings(@Param('userId') userId: string, @Req() req: RequestType) {
    return this.usersService.findWarnings(userId, req.roles);
  }

  @Delete('warnings/:warningId')
  @UseGuards(AuthGuard)
  @Roles(['OWNER', 'SERVER_ADMIN', 'GAME_ADMIN'])
  removeWarning(
    @Param('warningId') warningId: string,
    @Body() dto: OptionalPunishmentReasonDto,
    @Req() req: RequestType,
  ) {
    return this.usersService.removeWarning(
      warningId,
      dto,
      req.userId,
      req.roles,
    );
  }

  @Get(':userId/punishments')
  @UseGuards(AuthGuard)
  @Roles(['OWNER', 'SERVER_ADMIN', 'GAME_ADMIN'])
  findPunishmentHistory(
    @Param('userId') userId: string,
    @Req() req: RequestType,
  ) {
    return this.usersService.findPunishmentHistory(userId, req.roles);
  }

  @Get(':userId/history')
  @UseGuards(AuthGuard)
  findHistory(
    @Param('userId') userId: string,
    @Req() req: RequestType,
  ) {
    return this.usersService.findHistory(userId, req.userId, req.roles);
  }

  @Post('/ban/:userId/permanent')
  @UseGuards(AuthGuard)
  @Roles(['OWNER', 'SERVER_ADMIN'])
  permanentlyBanUser(
    @Param() paramDto: UnbanUserDto,
    @Body() dto: PunishmentReasonDto,
    @Req() req: RequestType,
  ) {
    return this.usersService.permanentlyBanUser(
      paramDto,
      dto,
      req.userId,
      req.roles,
    );
  }

  @Post('/ban/:userId/:bannedUntil')
  @UseGuards(AuthGuard)
  @Roles(['OWNER', 'SERVER_ADMIN', 'GAME_ADMIN'])
  banUser(
    @Param() paramDto: BanUserDto,
    @Body() dto: BanPunishmentDto,
    @Req() req: RequestType,
  ) {
    return this.usersService.banUser(paramDto, dto, req.userId, req.roles);
  }

  @Post('/unban/:userId')
  @UseGuards(AuthGuard)
  @Roles(['OWNER', 'SERVER_ADMIN', 'GAME_ADMIN'])
  unbanUser(
    @Param() params: UnbanUserDto,
    @Body() dto: OptionalPunishmentReasonDto,
    @Req() req: RequestType,
  ) {
    return this.usersService.unbanUser(params, dto, req.userId, req.roles);
  }

  @Get(':id')
  @UseGuards(OptionalAuthGuard)
  findOne(@Param('id') idOrName: string, @Req() req: RequestType) {
    return this.usersService.findOne(idOrName, {
      userId: req.userId,
      roles: req.roles,
    });
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @Roles(['OWNER'])
  delete(@Param('id') id: string) {
    return this.usersService.delete(id);
  }
}
