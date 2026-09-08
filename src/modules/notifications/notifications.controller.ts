import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/shared/guards/auth.guard';
import { RequestType } from 'src/utils/types';
import { FindNotificationsDto } from './dto/find-notifications.dto';
import { ReadAllNotificationsDto } from './dto/read-all-notifications.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(@Query() dto: FindNotificationsDto, @Req() req: RequestType) {
    return this.notificationsService.findForUser(req.userId, dto);
  }

  @Get('unread-count')
  getUnreadCount(@Req() req: RequestType) {
    return this.notificationsService.getUnreadCount(req.userId);
  }

  @Get('preferences')
  getPreferences(@Req() req: RequestType) {
    return this.notificationsService.getPreferences(req.userId);
  }

  @Put('preferences')
  updatePreferences(
    @Body() dto: UpdateNotificationPreferencesDto,
    @Req() req: RequestType,
  ) {
    return this.notificationsService.updatePreferences(req.userId, dto);
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @Req() req: RequestType) {
    return this.notificationsService.markAsRead(id, req.userId);
  }

  @Post('read-all')
  markAllAsRead(@Body() dto: ReadAllNotificationsDto, @Req() req: RequestType) {
    return this.notificationsService.markAllAsRead(req.userId, dto.group);
  }
}
