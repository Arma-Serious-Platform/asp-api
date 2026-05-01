import { Module } from "@nestjs/common";
import { PrismaModule } from "src/infrastructure/prisma/prisma.module";
import { JwtModule } from "@nestjs/jwt";
import { HeadquartersService } from "./headquarters.service";
import { HeadquartersController } from "./headquarters.controller";

@Module({
  imports: [PrismaModule, JwtModule],
  providers: [HeadquartersService],
  controllers: [HeadquartersController],
  exports: [HeadquartersService],
})
export class HeadquartersModule {}
