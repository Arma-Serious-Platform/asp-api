import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiOkResponse } from "@nestjs/swagger";
import { HeadquartersService } from "./headquarters.service";
import { AuthGuard } from "src/shared/guards/auth.guard";
import { RequestType } from "src/utils/types";
import { UpdateGamePlanDto } from "./dto/update-game-plan.dto";
import { UpdateGamePlanSlotDto } from "./dto/update-game-plan-slot.dto";
import { AssignSlotSquadDto } from "./dto/assign-slot-squad.dto";
import { CreateGamePlanCommentDto } from "./dto/create-game-plan-comment.dto";
import { UpdateGamePlanCommentDto } from "./dto/update-game-plan-comment.dto";
import { FindGamePlanCommentsDto } from "./dto/find-game-plan-comments.dto";
import { HeadquartersGamePlanResponseDto, HeadquartersSlotResponseDto } from "./dto/headquarters-response.dto";

@Controller('headquarters')
export class HeadquartersController {
  constructor(private readonly headquartersService: HeadquartersService) {}

  @Get('games/:gameId/plans')
  @UseGuards(AuthGuard)
  @ApiOkResponse({ type: HeadquartersGamePlanResponseDto, isArray: true })
  findPlansByGame(@Param('gameId') gameId: string, @Req() req: RequestType) {
    return this.headquartersService.findPlansByGame(gameId, req.userId);
  }

  @Get('plans/:id')
  @UseGuards(AuthGuard)
  @ApiOkResponse({ type: HeadquartersGamePlanResponseDto })
  findPlanById(@Param('id') id: string, @Req() req: RequestType) {
    return this.headquartersService.findPlanById(id, req.userId);
  }

  @Patch('plans/:id')
  @UseGuards(AuthGuard)
  @ApiOkResponse({ type: HeadquartersGamePlanResponseDto })
  updatePlan(@Param('id') id: string, @Body() dto: UpdateGamePlanDto, @Req() req: RequestType) {
    return this.headquartersService.updatePlan(id, dto, req.userId);
  }

  @Post('plans/:id/assign-commander')
  @UseGuards(AuthGuard)
  @ApiOkResponse({ type: HeadquartersGamePlanResponseDto })
  assignCommander(@Param('id') id: string, @Req() req: RequestType) {
    return this.headquartersService.assignCommander(id, req.userId);
  }

  @Post('plans/:id/unassign-commander')
  @UseGuards(AuthGuard)
  @ApiOkResponse({ type: HeadquartersGamePlanResponseDto })
  unassignCommander(@Param('id') id: string, @Req() req: RequestType) {
    return this.headquartersService.unassignCommander(id, req.userId, req.role);
  }

  @Patch('slots/:slotId')
  @UseGuards(AuthGuard)
  @ApiOkResponse({ type: HeadquartersSlotResponseDto })
  updateSlot(@Param('slotId') slotId: string, @Body() dto: UpdateGamePlanSlotDto, @Req() req: RequestType) {
    return this.headquartersService.updateSlot(slotId, dto, req.userId);
  }

  @Post('slots/:slotId/assign-squad')
  @UseGuards(AuthGuard)
  @ApiOkResponse({ type: HeadquartersSlotResponseDto })
  assignSquadToSlot(@Param('slotId') slotId: string, @Body() dto: AssignSlotSquadDto, @Req() req: RequestType) {
    return this.headquartersService.assignSquadToSlot(slotId, dto, req.userId);
  }

  @Post('slots/:slotId/unassign-squad')
  @UseGuards(AuthGuard)
  @ApiOkResponse({ type: HeadquartersSlotResponseDto })
  unassignSquadFromSlot(@Param('slotId') slotId: string, @Body() dto: AssignSlotSquadDto, @Req() req: RequestType) {
    return this.headquartersService.unassignSquadFromSlot(slotId, dto, req.userId);
  }

  @Post('slots/:slotId/wanted-squads/assign')
  @UseGuards(AuthGuard)
  @ApiOkResponse({ type: HeadquartersSlotResponseDto })
  assignMySquadAsWanted(@Param('slotId') slotId: string, @Req() req: RequestType) {
    return this.headquartersService.assignMySquadAsWanted(slotId, req.userId);
  }

  @Post('slots/:slotId/wanted-squads/unassign')
  @UseGuards(AuthGuard)
  @ApiOkResponse({ type: HeadquartersSlotResponseDto })
  unassignMySquadAsWanted(@Param('slotId') slotId: string, @Req() req: RequestType) {
    return this.headquartersService.unassignMySquadAsWanted(slotId, req.userId);
  }

  @Get('plans/:gamePlanId/comments')
  findComments(@Param('gamePlanId') gamePlanId: string, @Query() dto: FindGamePlanCommentsDto) {
    return this.headquartersService.findComments(gamePlanId, dto);
  }

  @Post('plans/:gamePlanId/comments')
  @UseGuards(AuthGuard)
  createComment(
    @Param('gamePlanId') gamePlanId: string,
    @Body() dto: CreateGamePlanCommentDto,
    @Req() req: RequestType,
  ) {
    return this.headquartersService.createComment(gamePlanId, dto, req.userId);
  }

  @Patch('comments/:id')
  @UseGuards(AuthGuard)
  updateComment(@Param('id') id: string, @Body() dto: UpdateGamePlanCommentDto, @Req() req: RequestType) {
    return this.headquartersService.updateComment(id, dto, req.userId);
  }

  @Delete('comments/:id')
  @UseGuards(AuthGuard)
  deleteComment(@Param('id') id: string, @Req() req: RequestType) {
    return this.headquartersService.deleteComment(id, req.userId);
  }
}
