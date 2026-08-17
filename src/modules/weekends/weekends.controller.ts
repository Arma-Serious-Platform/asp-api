import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Req } from "@nestjs/common";
import { Request } from "express";
import { WeekendsService } from "./weekends.service";
import { CreateWeekendDto, CreateGameDto } from "./dto/create-weekend.dto";
import { UpdateWeekendDto } from "./dto/update-weekend.dto";
import { FindWeekendsDto } from "./dto/find-weekends.dto";
import { UpdateGameDto } from "./dto/update-game.dto";
import { AuthGuard } from "src/shared/guards/auth.guard";
import { Roles } from "src/shared/decorators/roles.decorator";
import { AuthService } from "src/modules/auth/auth.service";

@Controller('weekends')
export class WeekendsController {
  constructor(
    private readonly weekendsService: WeekendsService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  async findAll(@Query() findWeekendsDto: FindWeekendsDto, @Req() req: Request) {
    const authUser = await this.authService.resolveRequestUser(req);
    return this.weekendsService.findAll(findWeekendsDto, authUser?.userId);
  }

  @Get(':id')
  async findById(@Param('id') id: string, @Req() req: Request) {
    const authUser = await this.authService.resolveRequestUser(req);
    return this.weekendsService.findById(id, authUser?.userId);
  }

  @Post()
  @UseGuards(AuthGuard)
  @Roles(['OWNER', 'SERVER_ADMIN', 'UVK'])
  create(@Body() createWeekendDto: CreateWeekendDto) {
    return this.weekendsService.create(createWeekendDto);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  @Roles(['OWNER', 'SERVER_ADMIN', 'UVK'])
  update(@Param('id') id: string, @Body() updateWeekendDto: UpdateWeekendDto) {
    return this.weekendsService.update(id, updateWeekendDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @Roles(['OWNER', 'SERVER_ADMIN', 'UVK'])
  delete(@Param('id') id: string) {
    return this.weekendsService.delete(id);
  }

  @Post(':weekendId/games')
  @UseGuards(AuthGuard)
  @Roles(['OWNER', 'SERVER_ADMIN', 'UVK'])
  createGame(@Param('weekendId') weekendId: string, @Body() createGameDto: CreateGameDto) {
    return this.weekendsService.createGame(weekendId, createGameDto);
  }

  @Patch(':weekendId/games/:gameId')
  @UseGuards(AuthGuard)
  @Roles(['OWNER', 'SERVER_ADMIN', 'UVK'])
  updateGame(@Param('gameId') gameId: string, @Body() updateGameDto: UpdateGameDto) {
    return this.weekendsService.updateGame(gameId, updateGameDto);
  }

  @Delete(':weekendId/games/:gameId')
  @UseGuards(AuthGuard)
  @Roles(['OWNER', 'SERVER_ADMIN', 'UVK'])
  deleteGame(@Param('gameId') gameId: string) {
    return this.weekendsService.deleteGame(gameId);
  }
}
