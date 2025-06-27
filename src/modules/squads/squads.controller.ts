import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { SquadsService } from './squads.service';

import { RolesGuard } from 'src/shared/guards/roles.guard';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { CreateSquadDto } from './dto/create-squad.dto';
import { DeleteSquadDto } from './dto/delete-squad.dto';

@Controller('squads')
export class SquadsController {
  constructor(private readonly squadsService: SquadsService) { }

  @Get()
  findAll() {
    return this.squadsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.squadsService.findOne(id);
  }

  @UseGuards(RolesGuard)
  @Roles(['OWNER', 'TECH_ADMIN'])
  @Post()
  create(@Body() dto: CreateSquadDto) {
    return this.squadsService.create(dto);
  }

  @UseGuards(RolesGuard)
  @Roles(['OWNER', 'TECH_ADMIN'])
  @Delete(':id')
  delete(@Param() dto: DeleteSquadDto) {
    return this.squadsService.delete(dto.id);
  }
}
