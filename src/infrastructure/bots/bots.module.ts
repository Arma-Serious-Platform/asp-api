import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { ChannelAnnouncementsService } from './channel-announcements.service';

@Module({
  providers: [TelegramService, ChannelAnnouncementsService],
  exports: [ChannelAnnouncementsService],
})
export class BotsModule {}
