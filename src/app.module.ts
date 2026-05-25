import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './modules/users/users.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { SidesModule } from './modules/sides/sides.module';
import { SquadsModule } from './modules/squads/squads.module';
import { ServersModule } from './modules/servers/servers.module';
import { MissionsModule } from './modules/missions/missions.module';
import { WeekendsModule } from './modules/weekends/weekends.module';
import { MissionCommentsModule } from './modules/mission-comments/mission-comments.module';
import { ChatsModule } from './modules/chats/chats.module';
import { HeadquartersModule } from './modules/headquarters/headquarters.module';
import { IslandsModule } from './modules/islands/islands.module';
import { RulesModule } from './modules/rules/rules.module';
import { SpecializationsModule } from './modules/specializations/specializations.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MailerModule.forRoot({
      transport: {
        host: process.env.EMAIL_HOST,
        secure: true,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      },
      defaults: {
        from: process.env.EMAIL_FROM,
      },
    }),
    UsersModule,
    ServersModule,
    SidesModule,
    SquadsModule,
    MissionsModule,
    WeekendsModule,
    HeadquartersModule,
    MissionCommentsModule,
    ChatsModule,
    IslandsModule,
    RulesModule,
    SpecializationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
