import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { SidesService } from './sides.service';
import { CreateSideDto } from './dto/create-side.dto';
import { UpdateSideDto } from './dto/update-side.dto';
import { AuthGuard } from 'src/shared/guards/auth.guard';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { AssignSquadDto } from './dto/assign-squad.dto';
import { UnassignSquadDto } from './dto/unassign-squad.dto';
import { AssignLeaderDto } from './dto/assign-leader.dto';

@Controller('sides')
export class SidesController {
  constructor(private readonly sidesService: SidesService) { }

  @Get()
  findAll() {
    return this.sidesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sidesService.findOne(id);
  }

  @UseGuards(AuthGuard)
  @Roles(['OWNER', 'TECH_ADMIN'])
  @Post()
  create(@Body() dto: CreateSideDto) {
    return this.sidesService.create(dto);
  }

  @UseGuards(AuthGuard)
  @Roles(['OWNER', 'TECH_ADMIN'])
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSideDto) {
    return this.sidesService.update(id, dto);
  }

  @UseGuards(AuthGuard)
  @Roles(['OWNER', 'TECH_ADMIN'])
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.sidesService.delete(id);
  }

  @UseGuards(AuthGuard)
  @Roles(['OWNER', 'TECH_ADMIN'])
  @Post(':id/assign-squad/:squadId')
  assignSquad(@Param() params: AssignSquadDto) {
    return this.sidesService.assignSquad(params);
  }

  @UseGuards(AuthGuard)
  @Roles(['OWNER', 'TECH_ADMIN'])
  @Post(':sideId/assign-leader/:leaderId')
  assignLeader(@Param() params: AssignLeaderDto) {
    return this.sidesService.assignLeader(params);
  }

  @UseGuards(AuthGuard)
  @Roles(['OWNER', 'TECH_ADMIN'])
  @Post(':id/unassign-squad/:squadId')
  unassignSquad(@Param() params: UnassignSquadDto) {
    return this.sidesService.unassignSquad(params);
  }
}
