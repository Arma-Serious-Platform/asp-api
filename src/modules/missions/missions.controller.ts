import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UploadedFiles, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileFieldsInterceptor, FileInterceptor } from "@nestjs/platform-express";
import { FindMissionsDto } from "./dto/find-missions.dto";
import { MissionsService } from "./missions.service";
import { AuthGuard } from "src/shared/guards/auth.guard";
import { Roles } from "src/shared/decorators/roles.decorator";
import { CreateMissionDto } from "./dto/create-mission.dto";
import { RequestType } from "src/utils/types";
import { FileValidation } from "src/shared/decorators/file.dectorator";
import { FileLike, isAllowedImageFile } from "src/shared/utils/file-signature";
import { CreateMissionVersionDto } from "./dto/create-mission-version.dto";
import { UpdateMissionDto } from "./dto/update-mission.dto";
import { ChangeMissionVersionStatusDto } from "./dto/change-mission-version-status.dto";
import { UpdateMissionVersionDto } from "./dto/update-mission-version.dto";
import { ChangeMissionStateDto } from "./dto/change-mission-state.dto";

@Controller('missions')
export class MissionsController {
  constructor(private readonly missionsService: MissionsService) { }

  private async validateFiles(
    files: File[] = [],
    { required = false, images = false }: { required?: boolean; images?: boolean } = {},
  ) {
    if (required && files.length === 0) {
      throw new BadRequestException('File is required');
    }

    const maxSize = 10 * 1024 * 1024;
    const exceeded = files.find((file) => file.size > maxSize);
    if (exceeded) {
      throw new BadRequestException(`File ${(exceeded as { originalname?: string }).originalname ?? 'unknown'} exceeds 10MB size limit`);
    }

    if (images) {
      for (const file of files) {
        // Handlers type uploads as DOM File; at runtime they are multer files.
        if (!(await isAllowedImageFile(file as unknown as FileLike))) {
          throw new BadRequestException('Screenshots must be JPEG, PNG, GIF or WebP images');
        }
      }
    }
  }

  @Get('islands')
  findAllIslands() {
    return this.missionsService.findAllIslands();
  }

  @Get()
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
  create(@FileValidation({ required: false, maxSize: 10 * 1024 * 1024 /* 10MB */ }) image: File, @Body() createMissionDto: CreateMissionDto, @Req() req: RequestType) {
    return this.missionsService.createMission(createMissionDto, req.userId, image);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  update(@FileValidation({ required: false, maxSize: 10 * 1024 * 1024 /* 10MB */ }) image: File, @Param('id') id: string, @Body() dto: UpdateMissionDto, @Req() req: RequestType) {
    return this.missionsService.updateMission(dto, id, req.userId, image);
  }

  @Patch(':id/state')
  @UseGuards(AuthGuard)
  changeState(@Param('id') id: string, @Body() dto: ChangeMissionStateDto, @Req() req: RequestType) {
    return this.missionsService.changeMissionState(dto, id, req.userId, req.roles);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @Roles(['OWNER', 'SERVER_ADMIN', 'UVK'])
  remove(@Param('id') id: string, @Req() req: RequestType) {
    return this.missionsService.deleteMission(id, req.userId);
  }

  @Post(':id/versions')
  @UseGuards(AuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'file', maxCount: 1 },
      { name: 'attackScreenshots', maxCount: 20 },
      { name: 'defenseScreenshots', maxCount: 20 },
      { name: 'friendlyScreenshots', maxCount: 20 },
    ]),
  )
  async createVersion(
    @UploadedFiles()
    files: {
      file?: File[];
      attackScreenshots?: File[];
      defenseScreenshots?: File[];
      friendlyScreenshots?: File[];
    },
    @Body() createMissionVersionDto: CreateMissionVersionDto,
    @Param('id') id: string,
    @Req() req: RequestType,
  ) {
    await this.validateFiles(files?.file ?? [], { required: true });
    await this.validateFiles(files?.attackScreenshots ?? [], { images: true });
    await this.validateFiles(files?.defenseScreenshots ?? [], { images: true });
    await this.validateFiles(files?.friendlyScreenshots ?? [], { images: true });

    return this.missionsService.createMissionVersion(
      { ...createMissionVersionDto, file: files.file?.[0] },
      id,
      req.userId,
      files.attackScreenshots ?? [],
      files.defenseScreenshots ?? [],
      files.friendlyScreenshots ?? [],
    );
  }

  @Patch(':id/versions/:versionId')
  @UseGuards(AuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'file', maxCount: 1 },
      { name: 'attackScreenshots', maxCount: 20 },
      { name: 'defenseScreenshots', maxCount: 20 },
      { name: 'friendlyScreenshots', maxCount: 20 },
    ]),
  )
  async updateVersion(
    @UploadedFiles()
    files: {
      file?: File[];
      attackScreenshots?: File[];
      defenseScreenshots?: File[];
      friendlyScreenshots?: File[];
    },
    @Body() dto: UpdateMissionVersionDto,
    @Param('versionId') versionId: string,
    @Req() req: RequestType,
  ) {
    await this.validateFiles(files?.file ?? []);
    await this.validateFiles(files?.attackScreenshots ?? [], { images: true });
    await this.validateFiles(files?.defenseScreenshots ?? [], { images: true });
    await this.validateFiles(files?.friendlyScreenshots ?? [], { images: true });

    return this.missionsService.updateMissionVersion(
      dto,
      versionId,
      req.userId,
      files.file?.[0],
      files.attackScreenshots ?? [],
      files.defenseScreenshots ?? [],
      files.friendlyScreenshots ?? [],
    );
  }

  @Delete(':id/versions/:versionId')
  @UseGuards(AuthGuard)
  @Roles(['OWNER', 'SERVER_ADMIN', 'UVK'])
  deleteVersion(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @Req() req: RequestType,
  ) {
    return this.missionsService.deleteMissionVersion(id, versionId, req.userId);
  }

  @Post(':id/versions/:versionId/change-status')
  @UseGuards(AuthGuard)
  changeStatus(@Param('versionId') versionId: string, @Body() dto: ChangeMissionVersionStatusDto, @Req() req: RequestType) {
    return this.missionsService.changeMissionVersionStatus(dto, versionId, req.userId);
  }
}