import { Module } from "@nestjs/common";
import { PrismaModule } from "src/infrastructure/prisma/prisma.module";
import { MinioModule } from "src/infrastructure/minio/minio.module";
import { HeadquartersService } from "./headquarters.service";
import { HeadquartersController } from "./headquarters.controller";
import { HeadquartersGateway } from "./headquarters.gateway";

@Module({
  imports: [PrismaModule, MinioModule],
  providers: [HeadquartersService, HeadquartersGateway],
  controllers: [HeadquartersController],
  exports: [HeadquartersService, HeadquartersGateway],
})
export class HeadquartersModule {}
