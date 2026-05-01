import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Req } from "@nestjs/common";
import { ApiOkResponse } from "@nestjs/swagger";
import { MissionCommentsService } from "./mission-comments.service";
import { CreateMissionCommentDto } from "./dto/create-mission-comment.dto";
import { UpdateMissionCommentDto } from "./dto/update-mission-comment.dto";
import { FindMissionCommentsDto } from "./dto/find-mission-comments.dto";
import {
  MissionCommentResponseDto,
  MissionCommentListResponseDto,
  MissionCommentDeletedResponseDto,
} from "./dto/mission-comment-response.dto";
import { AuthGuard } from "src/shared/guards/auth.guard";
import { RequestType } from "src/utils/types";

@Controller('mission-comments')
export class MissionCommentsController {
  constructor(private readonly missionCommentsService: MissionCommentsService) {}

  @Get()
  @ApiOkResponse({ description: 'Paginated list of mission comments', type: MissionCommentListResponseDto })
  findAll(@Query() dto: FindMissionCommentsDto) {
    return this.missionCommentsService.findAll(dto);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Single mission comment with user and mission', type: MissionCommentResponseDto })
  findById(@Param('id') id: string) {
    return this.missionCommentsService.findById(id);
  }

  @Post()
  @UseGuards(AuthGuard)
  @ApiOkResponse({ description: 'Created mission comment', type: MissionCommentResponseDto })
  create(@Body() dto: CreateMissionCommentDto, @Req() req: RequestType) {
    return this.missionCommentsService.create(dto, req.userId);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  @ApiOkResponse({ description: 'Updated mission comment', type: MissionCommentResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateMissionCommentDto, @Req() req: RequestType) {
    return this.missionCommentsService.update(id, dto, req.userId);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @ApiOkResponse({ description: 'Comment deleted', type: MissionCommentDeletedResponseDto })
  delete(@Param('id') id: string, @Req() req: RequestType) {
    return this.missionCommentsService.delete(id, req.userId);
  }
}
