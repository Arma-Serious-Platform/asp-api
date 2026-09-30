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
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { Multer } from 'multer';
import { AuthGuard } from 'src/shared/guards/auth.guard';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { RequestType } from 'src/utils/types';
import { validateAttachmentFiles } from 'src/shared/utils/validate-attachments';
import { isAllowedImageFile } from 'src/shared/utils/file-signature';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { FindNewsDto } from './dto/find-news.dto';
import { NewsService } from './news.service';
import { AnnounceChannelsDto } from 'src/shared/dto/announce-channels.dto';

const NEWS_ROLES = ['OWNER', 'SERVER_ADMIN', 'TECH_ADMIN', 'UVK'] as const;
const IMAGE_MAX_SIZE = 10 * 1024 * 1024;

@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  private async validateImage(image?: Multer.File) {
    if (!image) {
      return;
    }
    if (image.size > IMAGE_MAX_SIZE) {
      throw new BadRequestException('Image exceeds 10MB size limit');
    }
    if (!(await isAllowedImageFile(image))) {
      throw new BadRequestException('Only JPEG, PNG, GIF and WebP images are allowed');
    }
  }

  private async pickFiles(files?: {
    image?: Multer.File[];
    attachments?: Multer.File[];
  }) {
    const image = files?.image?.[0];
    const attachments = files?.attachments ?? [];
    await this.validateImage(image);
    await validateAttachmentFiles(attachments);
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

  @Post('admin/media')
  @UseGuards(AuthGuard)
  @Roles([...NEWS_ROLES])
  @UseInterceptors(FileInterceptor('file'))
  async uploadMedia(@UploadedFile() file?: Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    await this.validateImage(file);
    return this.newsService.uploadContentMedia(file);
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
  async create(
    @UploadedFiles()
    files: { image?: Multer.File[]; attachments?: Multer.File[] },
    @Body() dto: CreateNewsDto,
    @Req() req: RequestType,
  ) {
    const { image, attachments } = await this.pickFiles(files);
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
  async update(
    @Param('id') id: string,
    @UploadedFiles()
    files: { image?: Multer.File[]; attachments?: Multer.File[] },
    @Body() dto: UpdateNewsDto,
    @Req() req: RequestType,
  ) {
    const { image, attachments } = await this.pickFiles(files);
    return this.newsService.update(id, dto, req.userId, image, attachments);
  }

  @Post(':id/announce')
  @UseGuards(AuthGuard)
  @Roles([...NEWS_ROLES])
  announce(@Param('id') id: string, @Body() dto: AnnounceChannelsDto) {
    return this.newsService.announce(id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @Roles([...NEWS_ROLES])
  delete(@Param('id') id: string) {
    return this.newsService.delete(id);
  }
}
