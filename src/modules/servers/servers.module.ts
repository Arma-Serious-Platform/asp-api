import { Module } from "@nestjs/common";
import { PrismaModule } from "src/infrastructure/prisma/prisma.module";
import { ServersService } from "./servers.service";
import { ServersController } from "./servers.controller";
import { JwtModule } from "@nestjs/jwt";

@Module({
  imports: [JwtModule, PrismaModule],
  providers: [ServersService],
  controllers: [ServersController],
})
export class ServersModule { }
