import { Module } from "@nestjs/common";
import { PrismaModule } from "src/infrastructure/prisma/prisma.module";
import { JwtModule } from "@nestjs/jwt";
import { HeadquartersService } from "./headquarters.service";
import { HeadquartersController } from "./headquarters.controller";
import { HeadquartersGateway } from "./headquarters.gateway";

@Module({
  imports: [PrismaModule, JwtModule],
  providers: [HeadquartersService, HeadquartersGateway],
  controllers: [HeadquartersController],
  exports: [HeadquartersService, HeadquartersGateway],
})
export class HeadquartersModule {}
