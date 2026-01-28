import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from "@nestjs/common";
import { WeekendsService } from "./weekends.service";
import { CreateWeekendDto } from "./dto/create-weekend.dto";
import { UpdateWeekendDto } from "./dto/update-weekend.dto";
import { FindWeekendsDto } from "./dto/find-weekends.dto";
import { UpdateGameDto } from "./dto/update-game.dto";
import { AuthGuard } from "src/shared/guards/auth.guard";
import { Roles } from "src/shared/decorators/roles.decorator";

@Controller('weekends')
export class WeekendsController {
  constructor(private readonly weekendsService: WeekendsService) {}

  @Get()
  findAll(@Query() findWeekendsDto: FindWeekendsDto) {
    return this.weekendsService.findAll(findWeekendsDto);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.weekendsService.findById(id);
  }

  @Post()
  @UseGuards(AuthGuard)
  @Roles(['OWNER', 'TECH_ADMIN', 'GAME_ADMIN'])
  create(@Body() createWeekendDto: CreateWeekendDto) {
    return this.weekendsService.create(createWeekendDto);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  @Roles(['OWNER', 'TECH_ADMIN', 'GAME_ADMIN'])
  update(@Param('id') id: string, @Body() updateWeekendDto: UpdateWeekendDto) {
    return this.weekendsService.update(id, updateWeekendDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @Roles(['OWNER', 'TECH_ADMIN', 'GAME_ADMIN'])
  delete(@Param('id') id: string) {
    return this.weekendsService.delete(id);
  }

  @Patch(':weekendId/games/:gameId')
  @UseGuards(AuthGuard)
  @Roles(['OWNER', 'TECH_ADMIN', 'GAME_ADMIN'])
  updateGame(@Param('gameId') gameId: string, @Body() updateGameDto: UpdateGameDto) {
    return this.weekendsService.updateGame(gameId, updateGameDto);
  }

  @Delete(':weekendId/games/:gameId')
  @UseGuards(AuthGuard)
  @Roles(['OWNER', 'TECH_ADMIN', 'GAME_ADMIN'])
  deleteGame(@Param('gameId') gameId: string) {
    return this.weekendsService.deleteGame(gameId);
  }
}
