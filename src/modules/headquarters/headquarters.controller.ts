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
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { Multer } from "multer";
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
import { validateAttachmentFiles } from "src/shared/utils/validate-attachments";

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

  @Post('plans/:id/assign-hq-squad')
  @UseGuards(AuthGuard)
  @ApiOkResponse({ type: HeadquartersGamePlanResponseDto })
  assignHqSquad(@Param('id') id: string, @Req() req: RequestType) {
    return this.headquartersService.assignHqSquad(id, req.userId);
  }

  @Post('plans/:id/unassign-hq-squad')
  @UseGuards(AuthGuard)
  @ApiOkResponse({ type: HeadquartersGamePlanResponseDto })
  unassignHqSquad(@Param('id') id: string, @Req() req: RequestType) {
    return this.headquartersService.unassignHqSquad(id, req.userId, req.role);
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
  @UseGuards(AuthGuard)
  findComments(@Param('gamePlanId') gamePlanId: string, @Query() dto: FindGamePlanCommentsDto, @Req() req: RequestType) {
    return this.headquartersService.findComments(gamePlanId, dto, req.userId);
  }

  @Post('plans/:gamePlanId/comments')
  @UseGuards(AuthGuard)
  @UseInterceptors(FilesInterceptor('attachments', 10))
  createComment(
    @Param('gamePlanId') gamePlanId: string,
    @UploadedFiles() attachments: Multer.File[],
    @Body() dto: CreateGamePlanCommentDto,
    @Req() req: RequestType,
  ) {
    validateAttachmentFiles(attachments);
    return this.headquartersService.createComment(gamePlanId, dto, req.userId, attachments);
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
