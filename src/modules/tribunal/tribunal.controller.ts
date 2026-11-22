import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Multer } from 'multer';
import { AuthGuard } from 'src/shared/guards/auth.guard';
import { RequestType } from 'src/utils/types';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { resolveContentType } from 'src/shared/utils/file-signature';
import { validateAttachmentFiles } from 'src/shared/utils/validate-attachments';
import { AssignTribunalComplaintDto } from './dto/assign-tribunal-complaint.dto';
import { CreateTribunalComplaintDto } from './dto/create-tribunal-complaint.dto';
import { FindTribunalComplaintsDto } from './dto/find-tribunal-complaints.dto';
import { CreateTribunalMessageDto } from './dto/create-tribunal-message.dto';
import { ResolveTribunalComplaintDto } from './dto/resolve-tribunal-complaint.dto';
import { SetTribunalRuleDto } from './dto/set-tribunal-rule.dto';
import { TribunalService } from './tribunal.service';

const assertPhotoOrVideo = async (files: Multer.File[] = []) => {
  await validateAttachmentFiles(files);

  for (const file of files) {
    const mimeType = (await resolveContentType(file)).split(';')[0].trim();

    if (!mimeType.startsWith('image/') && !mimeType.startsWith('video/')) {
      throw new BadRequestException(
        `Можна додати лише фото або відео: ${file.originalname ?? 'файл'}`,
      );
    }
  }
};

@Controller('tribunal')
@UseGuards(AuthGuard)
export class TribunalController {
  constructor(private readonly tribunalService: TribunalService) {}

  @Get()
  findAll(@Query() query: FindTribunalComplaintsDto) {
    return this.tribunalService.findAll(query);
  }

  @Get('filters')
  findFilters() {
    return this.tribunalService.findFilters();
  }

  @Get('games')
  findGames() {
    return this.tribunalService.findGames();
  }

  @Get('admins')
  @Roles(['OWNER', 'SERVER_ADMIN', 'GAME_ADMIN'])
  findAdmins() {
    return this.tribunalService.findAdmins();
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: RequestType) {
    return this.tribunalService.findOne(id, req.userId, req.roles);
  }

  @Post()
  create(@Body() dto: CreateTribunalComplaintDto, @Req() req: RequestType) {
    return this.tribunalService.create(dto, req.userId, req.roles);
  }

  @Post(':id/attachments')
  @UseInterceptors(FilesInterceptor('attachments', 10))
  async addAttachments(
    @Param('id') id: string,
    @UploadedFiles() attachments: Multer.File[] = [],
    @Req() req: RequestType,
  ) {
    if (!attachments.length) {
      throw new BadRequestException('Оберіть фото або відео');
    }

    await assertPhotoOrVideo(attachments);
    return this.tribunalService.addAttachments(id, attachments, req.userId, req.roles);
  }

  @Post(':id/rule')
  @Roles(['OWNER', 'SERVER_ADMIN', 'GAME_ADMIN'])
  setRule(
    @Param('id') id: string,
    @Body() dto: SetTribunalRuleDto,
    @Req() req: RequestType,
  ) {
    return this.tribunalService.setRule(id, dto, req.userId, req.roles);
  }

  @Post(':id/assign')
  @Roles(['OWNER', 'SERVER_ADMIN', 'GAME_ADMIN'])
  assign(
    @Param('id') id: string,
    @Body() dto: AssignTribunalComplaintDto,
    @Req() req: RequestType,
  ) {
    return this.tribunalService.assign(id, dto, req.userId, req.roles);
  }

  @Post(':id/resolve')
  @Roles(['OWNER', 'SERVER_ADMIN', 'GAME_ADMIN'])
  resolve(
    @Param('id') id: string,
    @Body() dto: ResolveTribunalComplaintDto,
    @Req() req: RequestType,
  ) {
    return this.tribunalService.resolve(id, dto, req.userId, req.roles);
  }

  @Delete(':id/messages/:messageId')
  @Roles(['OWNER', 'SERVER_ADMIN', 'GAME_ADMIN'])
  deleteMessage(
    @Param('id') id: string,
    @Param('messageId') messageId: string,
    @Req() req: RequestType,
  ) {
    return this.tribunalService.deleteMessage(id, messageId, req.roles);
  }

  @Post(':id/messages')
  createMessage(
    @Param('id') id: string,
    @Body() dto: CreateTribunalMessageDto,
    @Req() req: RequestType,
  ) {
    return this.tribunalService.createMessage(id, dto, req.userId, req.roles);
  }
}
