import { Controller, Get, Param, Post } from '@nestjs/common';
import { SquadsService } from './squads.service';
import { AssignSquadToSideDto } from './dto/assign-squad-to-side.dto';

@Controller('squads')
export class SquadsController {
  constructor(private readonly squadsService: SquadsService) {}

  @Get()
  findAll() {
    return this.squadsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.squadsService.findOne(id);
  }

  @Post('/squad/:squadId/assign/:sideId')
  assignSquadToSide(@Param() dto: AssignSquadToSideDto) {
    return this.squadsService.assignSquadToSide(dto);
  }
}
