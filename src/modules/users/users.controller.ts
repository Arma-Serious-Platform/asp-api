import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { GetMeDto } from './dto/get-me-dto';
import { ChangeUserRoleDto } from './dto/change-user-role.dto';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfirmSignUpDto } from './dto/confirm-sign-up.dto';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly mailerService: MailerService,
  ) {}

  @Get()
  me(@Param('id') paramDto: GetMeDto) {
    return this.usersService.me(paramDto);
  }

  @Post('/sign-up/confirm')
  confirmSignUp(@Body() confirmSignUpDto: ConfirmSignUpDto) {
    return this.usersService.confirmSignUp(confirmSignUpDto);
  }

  @Post('/signup')
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.signUp(createUserDto);
  }

  @Patch('/change-role')
  changeUserRole(@Body() changeUserRoleDto: ChangeUserRoleDto) {
    return this.usersService.changeUserRole(changeUserRoleDto);
  }

  @Post('login')
  login(@Body() loginUserDto: LoginUserDto) {
    return this.usersService.login(loginUserDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
