import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { SignUpDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { GetMeDto } from './dto/get-me-dto';
import { ChangeUserRoleDto } from './dto/change-user-role.dto';

import { ConfirmSignUpDto } from './dto/confirm-sign-up.dto';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { AuthGuard } from 'src/shared/guards/auth.guard';
import { BanUserDto } from './dto/ban-user.dto';

import { RequestType } from 'src/utils/types';
import { UnbanUserDto } from './dto/unban-user.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { GetUsersDto } from './dto/get-users.dto';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) { }

  @Get()
  @UseGuards(AuthGuard)
  @Roles(['OWNER', 'GAME_ADMIN', 'TECH_ADMIN'])
  find(@Query() dto: GetUsersDto) {
    return this.usersService.findAll(dto);
  }

  @Post('/login')
  login(@Body() loginUserDto: LoginUserDto) {
    return this.usersService.login(loginUserDto);
  }


  @Get('/me')
  @UseGuards(AuthGuard)
  me(@Req() req: RequestType) {
    return this.usersService.me(req.userId);
  }

  @Post('/signup')
  create(@Body() signUpDto: SignUpDto) {
    return this.usersService.signUp(signUpDto);
  }

  @Post('/sign-up/confirm')
  confirmSignUp(@Body() confirmSignUpDto: ConfirmSignUpDto) {
    return this.usersService.confirmSignUp(confirmSignUpDto);
  }

  @Post('/change-password')
  @UseGuards(AuthGuard)
  changePassword(@Body() changePasswordDto: ChangePasswordDto, @Req() req: RequestType) {
    return this.usersService.changePassword(changePasswordDto, req.userId);
  }

  @Post('/forgot-password')
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.usersService.forgotPassword(forgotPasswordDto);
  }

  @Post('/reset-password')
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.usersService.resetPassword(resetPasswordDto);
  }

  @Post('/change-role')
  @UseGuards(AuthGuard)
  @Roles(['OWNER'])
  changeUserRole(@Body() changeUserRoleDto: ChangeUserRoleDto) {
    return this.usersService.changeUserRole(changeUserRoleDto);
  }

  @Post('/change-avatar')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('avatar'))
  changeAvatar(@UploadedFile() avatar: File, @Req() req: RequestType) {
    return this.usersService.changeAvatar(avatar, req.userId);
  }

  @Post(`/ban/:userId`)
  @UseGuards(AuthGuard)
  @Roles(['OWNER', 'GAME_ADMIN', 'TECH_ADMIN'])
  banUser(@Param() paramDto: BanUserDto, @Req() req: RequestType) {
    return this.usersService.banUser(paramDto, req.role);
  }

  @Post('/unban/:userId')
  @Roles(['OWNER', 'GAME_ADMIN', 'TECH_ADMIN'])
  unbanUser(@Param() params: UnbanUserDto, @Req() req: RequestType) {
    return this.usersService.unbanUser(params, req.role);
  }

  @Delete(':id')
  @Roles(['OWNER', 'TECH_ADMIN'])
  delete(@Param('id') id: string) {
    return this.usersService.delete(id);
  }
}
