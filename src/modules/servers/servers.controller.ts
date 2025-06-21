import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ServersService } from "./servers.service";
import { CreateServerDto } from "./dto/create-server.dto";

@Controller('servers')
export class ServersController {
  constructor(private readonly serversService: ServersService) { }

  @Get()
  findAll() {
    return this.serversService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.serversService.findOne(id);
  }

  @Post()
  create(@Body() createServerDto: CreateServerDto) {
    return this.serversService.create(createServerDto);
  }
}
