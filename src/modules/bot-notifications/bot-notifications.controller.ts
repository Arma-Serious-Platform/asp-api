import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/shared/guards/auth.guard';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { RequestType } from 'src/utils/types';
import { BotNotificationsService } from './bot-notifications.service';
import { CreateBotNotificationDto } from './dto/create-bot-notification.dto';
import { UpdateBotNotificationDto } from './dto/update-bot-notification.dto';
import { SendBotNotificationDto } from './dto/send-bot-notification.dto';

@Controller('bot-notifications')
@UseGuards(AuthGuard)
export class BotNotificationsController {
  constructor(private readonly botNotificationsService: BotNotificationsService) {}

  @Get()
  @Roles(['OWNER', 'SERVER_ADMIN', 'GAME_ADMIN', 'MINI_ADMIN'])
  findAll(@Req() req: RequestType) {
    return this.botNotificationsService.findAll(req.roles);
  }

  @Get(':id')
  @Roles(['OWNER', 'SERVER_ADMIN', 'GAME_ADMIN', 'MINI_ADMIN'])
  findById(@Param('id') id: string, @Req() req: RequestType) {
    return this.botNotificationsService.findById(id, req.roles);
  }

  @Post()
  @Roles(['OWNER', 'SERVER_ADMIN'])
  create(@Body() dto: CreateBotNotificationDto) {
    return this.botNotificationsService.create(dto);
  }

  @Patch(':id')
  @Roles(['OWNER', 'SERVER_ADMIN'])
  update(@Param('id') id: string, @Body() dto: UpdateBotNotificationDto) {
    return this.botNotificationsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(['OWNER', 'SERVER_ADMIN'])
  delete(@Param('id') id: string) {
    return this.botNotificationsService.delete(id);
  }

  @Post(':id/send')
  @Roles(['OWNER', 'SERVER_ADMIN', 'GAME_ADMIN', 'MINI_ADMIN'])
  send(
    @Param('id') id: string,
    @Body() dto: SendBotNotificationDto,
    @Req() req: RequestType,
  ) {
    return this.botNotificationsService.sendManual(id, dto.message, req.roles);
  }
}
