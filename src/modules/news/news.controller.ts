import {
  BadRequestException,
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
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Multer } from 'multer';
import { AuthGuard } from 'src/shared/guards/auth.guard';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { RequestType } from 'src/utils/types';
import { validateAttachmentFiles } from 'src/shared/utils/validate-attachments';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { FindNewsDto } from './dto/find-news.dto';
import { NewsService } from './news.service';

const NEWS_ROLES = ['OWNER', 'SERVER_ADMIN', 'TECH_ADMIN', 'UVK'] as const;
const IMAGE_MAX_SIZE = 10 * 1024 * 1024;

@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  private validateImage(image?: Multer.File) {
    if (!image) {
      return;
    }
    if (image.size > IMAGE_MAX_SIZE) {
      throw new BadRequestException('Image exceeds 10MB size limit');
    }
  }

  private pickFiles(files?: {
    image?: Multer.File[];
    attachments?: Multer.File[];
  }) {
    const image = files?.image?.[0];
    const attachments = files?.attachments ?? [];
    this.validateImage(image);
    validateAttachmentFiles(attachments);
    return { image, attachments };
  }

  @Get()
  findPublic(@Query() dto: FindNewsDto) {
    return this.newsService.findPublic(dto);
  }

  @Get('admin')
  @UseGuards(AuthGuard)
  @Roles([...NEWS_ROLES])
  findAdmin(@Query() dto: FindNewsDto) {
    return this.newsService.findAdmin(dto);
  }

  @Get('admin/:id')
  @UseGuards(AuthGuard)
  @Roles([...NEWS_ROLES])
  findAdminById(@Param('id') id: string) {
    return this.newsService.findAdminById(id);
  }

  @Get(':id')
  findPublicById(@Param('id') id: string) {
    return this.newsService.findPublicById(id);
  }

  @Post()
  @UseGuards(AuthGuard)
  @Roles([...NEWS_ROLES])
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'image', maxCount: 1 },
      { name: 'attachments', maxCount: 10 },
    ]),
  )
  create(
    @UploadedFiles()
    files: { image?: Multer.File[]; attachments?: Multer.File[] },
    @Body() dto: CreateNewsDto,
    @Req() req: RequestType,
  ) {
    const { image, attachments } = this.pickFiles(files);
    return this.newsService.create(dto, req.userId, image, attachments);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  @Roles([...NEWS_ROLES])
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'image', maxCount: 1 },
      { name: 'attachments', maxCount: 10 },
    ]),
  )
  update(
    @Param('id') id: string,
    @UploadedFiles()
    files: { image?: Multer.File[]; attachments?: Multer.File[] },
    @Body() dto: UpdateNewsDto,
    @Req() req: RequestType,
  ) {
    const { image, attachments } = this.pickFiles(files);
    return this.newsService.update(id, dto, req.userId, image, attachments);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @Roles([...NEWS_ROLES])
  delete(@Param('id') id: string) {
    return this.newsService.delete(id);
  }
}
