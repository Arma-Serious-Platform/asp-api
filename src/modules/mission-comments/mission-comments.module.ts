import { Module } from "@nestjs/common";
import { PrismaModule } from "src/infrastructure/prisma/prisma.module";
import { MinioModule } from "src/infrastructure/minio/minio.module";
import { MissionCommentsService } from "./mission-comments.service";
import { MissionCommentsController } from "./mission-comments.controller";
import { MissionCommentsGateway } from "./mission-comments.gateway";
import { JwtModule } from "@nestjs/jwt";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [PrismaModule, MinioModule, JwtModule, UsersModule],
  providers: [MissionCommentsService, MissionCommentsGateway],
  controllers: [MissionCommentsController],
  exports: [MissionCommentsService, MissionCommentsGateway],
})
export class MissionCommentsModule {}
