import { Module } from "@nestjs/common";
import { PrismaModule } from "src/infrastructure/prisma/prisma.module";
import { MissionsService } from "./missions.service";
import { MissionsController } from "./missions.controller";

@Module({
  imports: [PrismaModule],
  providers: [MissionsService],
  controllers: [MissionsController],
})
export class MissionsModule {}