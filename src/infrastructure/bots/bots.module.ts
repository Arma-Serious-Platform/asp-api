import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { DiscordService } from './discord.service';
import { ChannelAnnouncementsService } from './channel-announcements.service';

@Module({
  providers: [TelegramService, DiscordService, ChannelAnnouncementsService],
  exports: [ChannelAnnouncementsService],
})
export class BotsModule {}
