import { Module } from "@nestjs/common";
import { PrismaModule } from "src/infrastructure/prisma/prisma.module";
import { WeekendsService } from "./weekends.service";
import { WeekendsController } from "./weekends.controller";
import { JwtModule } from "@nestjs/jwt";
import { HeadquartersModule } from "../headquarters/headquarters.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [PrismaModule, JwtModule, HeadquartersModule, NotificationsModule],
  providers: [WeekendsService],
  controllers: [WeekendsController],
})
export class WeekendsModule {}
