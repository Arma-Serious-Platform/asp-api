import { Module } from "@nestjs/common";
import { PrismaModule } from "src/infrastructure/prisma/prisma.module";
import { WeekendsService } from "./weekends.service";
import { WeekendsController } from "./weekends.controller";
import { JwtModule } from "@nestjs/jwt";
import { HeadquartersModule } from "../headquarters/headquarters.module";

@Module({
  imports: [PrismaModule, JwtModule, HeadquartersModule],
  providers: [WeekendsService],
  controllers: [WeekendsController],
})
export class WeekendsModule {}
