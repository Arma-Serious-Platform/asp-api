import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { FindMissionsDto } from "./dto/find-missions.dto";
import { MissionsService } from "./missions.service";
import { AuthGuard } from "src/shared/guards/auth.guard";
import { CreateMissionDto } from "./dto/create-mission.dto";
import { RequestType } from "src/utils/types";
import { FileValidation } from "src/shared/decorators/file.dectorator";
import { CreateMissionVersionDto } from "./dto/create-mission-version.dto";
import { UpdateMissionDto } from "./dto/update-mission.dto";

@Controller('missions')
export class MissionsController {
  constructor(private readonly missionsService: MissionsService) { }

  @Get()
  @UseGuards(AuthGuard)
  findAll(@Query() findMissionsDto: FindMissionsDto) {
    return this.missionsService.findAll(findMissionsDto);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.missionsService.findById({ id });
  }

  @Post()
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  create(@FileValidation({ required: false, maxSize: 5 * 1024 * 1024 /* 5MB */ }) image: File, @Body() createMissionDto: CreateMissionDto, @Req() req: RequestType) {
    return this.missionsService.createMission(createMissionDto, req.userId, image);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  update(@FileValidation({ required: false, maxSize: 5 * 1024 * 1024 /* 5MB */ }) image: File, @Param('id') id: string, @Body() dto: UpdateMissionDto, @Req() req: RequestType) {
    return this.missionsService.updateMission(dto, id, req.userId, image);
  }

  @Post(':id/versions')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  createVersion(@FileValidation() file: File, @Body() createMissionVersionDto: CreateMissionVersionDto, @Param('id') id: string) {
    return this.missionsService.createMissionVersion({ ...createMissionVersionDto, file }, id);
  }
}