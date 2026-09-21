import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from 'src/infrastructure/prisma/prisma.module';
import { BotsModule } from 'src/infrastructure/bots/bots.module';
import { BotNotificationsController } from './bot-notifications.controller';
import { BotNotificationsService } from './bot-notifications.service';

@Module({
  imports: [PrismaModule, JwtModule, BotsModule],
  controllers: [BotNotificationsController],
  providers: [BotNotificationsService],
})
export class BotNotificationsModule {}
