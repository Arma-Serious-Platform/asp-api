import { Module } from "@nestjs/common";
import { PrismaModule } from "src/infrastructure/prisma/prisma.module";
import { MissionsService } from "./missions.service";
import { MissionsController } from "./missions.controller";
import { MinioModule } from "src/infrastructure/minio/minio.module";
import { JwtModule } from "@nestjs/jwt";
import { PboParserModule } from "src/infrastructure/pbo-parser/pbo-parser.module";
import { HeadquartersModule } from "src/modules/headquarters/headquarters.module";

@Module({
  imports: [PrismaModule, MinioModule, JwtModule, PboParserModule, HeadquartersModule],
  providers: [MissionsService],
  controllers: [MissionsController],
})
export class MissionsModule {}