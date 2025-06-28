import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ServersService } from "./servers.service";
import { CreateServerDto } from "./dto/create-server.dto";
import { AuthGuard } from "src/shared/guards/auth.guard";
import { Roles } from "src/shared/decorators/roles.decorator";
import { FindServersDto } from "./dto/find-servers.dto";
import { EditServerDto } from "./dto/edit-server.dto";

@Controller('servers')
export class ServersController {
  constructor(private readonly serversService: ServersService) { }

  @Get()
  findAll(@Query() findServersDto: FindServersDto) {
    return this.serversService.findAll(findServersDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.serversService.findOne(id);
  }

  @Post()
  @UseGuards(AuthGuard)
  @Roles(['OWNER', 'TECH_ADMIN'])
  create(@Body() createServerDto: CreateServerDto) {
    return this.serversService.create(createServerDto);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  @Roles(['OWNER', 'TECH_ADMIN'])
  update(@Param('id') id: string, @Body() editServerDto: EditServerDto) {
    return this.serversService.update(id, editServerDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @Roles(['OWNER', 'TECH_ADMIN'])
  delete(@Param('id') id: string) {
    return this.serversService.delete(id);
  }
}
