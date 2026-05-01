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
import { HeadquartersService } from "./headquarters.service";
import { AuthGuard } from "src/shared/guards/auth.guard";
import { RequestType } from "src/utils/types";
import { UpdateGamePlanDto } from "./dto/update-game-plan.dto";
import { UpdateGamePlanSlotDto } from "./dto/update-game-plan-slot.dto";
import { AssignSlotSquadDto } from "./dto/assign-slot-squad.dto";
import { CreateGamePlanCommentDto } from "./dto/create-game-plan-comment.dto";
import { UpdateGamePlanCommentDto } from "./dto/update-game-plan-comment.dto";
import { FindGamePlanCommentsDto } from "./dto/find-game-plan-comments.dto";

@Controller('headquarters')
export class HeadquartersController {
  constructor(private readonly headquartersService: HeadquartersService) {}

  @Get('games/:gameId/plans')
  @UseGuards(AuthGuard)
  findPlansByGame(@Param('gameId') gameId: string, @Req() req: RequestType) {
    return this.headquartersService.findPlansByGame(gameId, req.userId);
  }

  @Get('plans/:id')
  @UseGuards(AuthGuard)
  findPlanById(@Param('id') id: string, @Req() req: RequestType) {
    return this.headquartersService.findPlanById(id, req.userId);
  }

  @Patch('plans/:id')
  @UseGuards(AuthGuard)
  updatePlan(@Param('id') id: string, @Body() dto: UpdateGamePlanDto, @Req() req: RequestType) {
    return this.headquartersService.updatePlan(id, dto, req.userId);
  }

  @Post('plans/:id/assign-commander')
  @UseGuards(AuthGuard)
  assignCommander(@Param('id') id: string, @Req() req: RequestType) {
    return this.headquartersService.assignCommander(id, req.userId);
  }

  @Post('plans/:id/unassign-commander')
  @UseGuards(AuthGuard)
  unassignCommander(@Param('id') id: string, @Req() req: RequestType) {
    return this.headquartersService.unassignCommander(id, req.userId, req.role);
  }

  @Patch('slots/:slotId')
  @UseGuards(AuthGuard)
  updateSlot(@Param('slotId') slotId: string, @Body() dto: UpdateGamePlanSlotDto, @Req() req: RequestType) {
    return this.headquartersService.updateSlot(slotId, dto, req.userId);
  }

  @Post('slots/:slotId/assign-squad')
  @UseGuards(AuthGuard)
  assignSquadToSlot(@Param('slotId') slotId: string, @Body() dto: AssignSlotSquadDto, @Req() req: RequestType) {
    return this.headquartersService.assignSquadToSlot(slotId, dto, req.userId);
  }

  @Post('slots/:slotId/unassign-squad')
  @UseGuards(AuthGuard)
  unassignSquadFromSlot(@Param('slotId') slotId: string, @Body() dto: AssignSlotSquadDto, @Req() req: RequestType) {
    return this.headquartersService.unassignSquadFromSlot(slotId, dto, req.userId);
  }

  @Post('slots/:slotId/wanted-squads/assign')
  @UseGuards(AuthGuard)
  assignMySquadAsWanted(@Param('slotId') slotId: string, @Req() req: RequestType) {
    return this.headquartersService.assignMySquadAsWanted(slotId, req.userId);
  }

  @Post('slots/:slotId/wanted-squads/unassign')
  @UseGuards(AuthGuard)
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
