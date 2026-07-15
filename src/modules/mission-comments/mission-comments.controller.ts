import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Req, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { Multer } from "multer";
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
import { validateAttachmentFiles } from "src/shared/utils/validate-attachments";

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
  @UseInterceptors(FilesInterceptor('attachments', 10))
  @ApiOkResponse({ description: 'Created mission comment', type: MissionCommentResponseDto })
  create(
    @UploadedFiles() attachments: Multer.File[],
    @Body() dto: CreateMissionCommentDto,
    @Req() req: RequestType,
  ) {
    validateAttachmentFiles(attachments);
    return this.missionCommentsService.create(dto, req.userId, attachments);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  @UseInterceptors(FilesInterceptor('attachments', 10))
  @ApiOkResponse({ description: 'Updated mission comment', type: MissionCommentResponseDto })
  update(
    @Param('id') id: string,
    @UploadedFiles() attachments: Multer.File[],
    @Body() dto: UpdateMissionCommentDto,
    @Req() req: RequestType,
  ) {
    validateAttachmentFiles(attachments);
    return this.missionCommentsService.update(id, dto, req.userId, attachments);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @ApiOkResponse({ description: 'Comment deleted', type: MissionCommentDeletedResponseDto })
  delete(@Param('id') id: string, @Req() req: RequestType) {
    return this.missionCommentsService.delete(id, req.userId);
  }
}
