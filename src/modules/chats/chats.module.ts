import { Module } from "@nestjs/common";
import { PrismaModule } from "src/infrastructure/prisma/prisma.module";
import { MinioModule } from "src/infrastructure/minio/minio.module";
import { ChatsService } from "./chats.service";
import { ChatsController } from "./chats.controller";
import { ChatsGateway } from "./chats.gateway";
import { JwtModule } from "@nestjs/jwt";
import { UsersModule } from "../users/users.module";

import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [PrismaModule, MinioModule, JwtModule, UsersModule, NotificationsModule],
  providers: [ChatsService, ChatsGateway],
  controllers: [ChatsController],
  exports: [ChatsService, ChatsGateway],
})
export class ChatsModule {}
