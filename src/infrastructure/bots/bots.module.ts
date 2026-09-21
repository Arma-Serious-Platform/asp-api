import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/infrastructure/prisma/prisma.module';
import { TelegramService } from './telegram.service';
import { DiscordService } from './discord.service';
import { ChannelAnnouncementsService } from './channel-announcements.service';

@Module({
  imports: [PrismaModule],
  providers: [TelegramService, DiscordService, ChannelAnnouncementsService],
  exports: [ChannelAnnouncementsService],
})
export class BotsModule {}
