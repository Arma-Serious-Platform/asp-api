import { Module } from "@nestjs/common";
import { PrismaModule } from "src/infrastructure/prisma/prisma.module";
import { WeekendsService } from "./weekends.service";
import { WeekendsController } from "./weekends.controller";
import { JwtModule } from "@nestjs/jwt";

@Module({
  imports: [PrismaModule, JwtModule],
  providers: [WeekendsService],
  controllers: [WeekendsController],
})
export class WeekendsModule {}
