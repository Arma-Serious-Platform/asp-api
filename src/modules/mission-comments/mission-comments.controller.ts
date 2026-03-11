import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Req } from "@nestjs/common";
import { MissionCommentsService } from "./mission-comments.service";
import { CreateMissionCommentDto } from "./dto/create-mission-comment.dto";
import { UpdateMissionCommentDto } from "./dto/update-mission-comment.dto";
import { FindMissionCommentsDto } from "./dto/find-mission-comments.dto";
import { AuthGuard } from "src/shared/guards/auth.guard";
import { RequestType } from "src/utils/types";

@Controller('mission-comments')
export class MissionCommentsController {
  constructor(private readonly missionCommentsService: MissionCommentsService) {}

  @Get()
  findAll(@Query() dto: FindMissionCommentsDto) {
    return this.missionCommentsService.findAll(dto);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.missionCommentsService.findById(id);
  }

  @Post()
  @UseGuards(AuthGuard)
  create(@Body() dto: CreateMissionCommentDto, @Req() req: RequestType) {
    return this.missionCommentsService.create(dto, req.userId);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdateMissionCommentDto, @Req() req: RequestType) {
    return this.missionCommentsService.update(id, dto, req.userId);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  delete(@Param('id') id: string, @Req() req: RequestType) {
    return this.missionCommentsService.delete(id, req.userId);
  }
}
