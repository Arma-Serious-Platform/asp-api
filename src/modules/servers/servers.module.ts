import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { ServersService } from "./servers.service";
import { ServersController } from "./servers.controller";

@Module({
  imports: [PrismaModule],
  providers: [ServersService],
  controllers: [ServersController],
})
export class ServersModule { }
