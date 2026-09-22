import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Multer } from 'multer';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { FileValidation } from 'src/shared/decorators/file.dectorator';
import { AuthGuard } from 'src/shared/guards/auth.guard';
import { RequestType } from 'src/utils/types';
import { AchievementsService } from './achievements.service';
import { CreateAchievementDto } from './dto/create-achievement.dto';
import { SetUserAchievementsDto } from './dto/set-user-achievements.dto';
import { UpdateAchievementDto } from './dto/update-achievement.dto';

@Controller('achievements')
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) {}

  @Get()
  findAll() {
    return this.achievementsService.findAll();
  }

  @Put('users/:userId')
  @UseGuards(AuthGuard)
  @Roles(['OWNER', 'SERVER_ADMIN'])
  setUserAchievements(
    @Param('userId') userId: string,
    @Body() dto: SetUserAchievementsDto,
    @Req() req: RequestType,
  ) {
    return this.achievementsService.setUserAchievements(
      req.userId,
      userId,
      dto.achievementIds,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.achievementsService.findOne(id);
  }

  @Post()
  @UseGuards(AuthGuard)
  @Roles(['OWNER', 'SERVER_ADMIN'])
  @UseInterceptors(FileInterceptor('icon'))
  create(
    @FileValidation({ required: true }) icon: Multer.File,
    @Body() dto: CreateAchievementDto,
  ) {
    return this.achievementsService.create(dto, icon);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  @Roles(['OWNER', 'SERVER_ADMIN'])
  @UseInterceptors(FileInterceptor('icon'))
  update(
    @FileValidation({ required: false }) icon: Multer.File,
    @Param('id') id: string,
    @Body() dto: UpdateAchievementDto,
  ) {
    return this.achievementsService.update(id, dto, icon);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @Roles(['OWNER', 'SERVER_ADMIN'])
  delete(@Param('id') id: string) {
    return this.achievementsService.delete(id);
  }
}
