import { Module } from "@nestjs/common";
import { PrismaModule } from "src/infrastructure/prisma/prisma.module";
import { MinioModule } from "src/infrastructure/minio/minio.module";
import { ChatsService } from "./chats.service";
import { ChatsController } from "./chats.controller";
import { ChatsGateway } from "./chats.gateway";
import { JwtModule } from "@nestjs/jwt";

@Module({
  imports: [PrismaModule, MinioModule, JwtModule],
  providers: [ChatsService, ChatsGateway],
  controllers: [ChatsController],
  exports: [ChatsService, ChatsGateway],
})
export class ChatsModule {}
