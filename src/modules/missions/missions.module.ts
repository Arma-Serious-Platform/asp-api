import { Module } from "@nestjs/common";
import { PrismaModule } from "src/infrastructure/prisma/prisma.module";
import { MissionsService } from "./missions.service";
import { MissionsController } from "./missions.controller";
import { MinioModule } from "src/infrastructure/minio/minio.module";
import { JwtModule } from "@nestjs/jwt";

@Module({
  imports: [PrismaModule, MinioModule, JwtModule],
  providers: [MissionsService],
  controllers: [MissionsController],
})
export class MissionsModule {}