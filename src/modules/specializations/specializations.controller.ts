import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { FileValidation } from 'src/shared/decorators/file.dectorator';
import { AuthGuard } from 'src/shared/guards/auth.guard';
import { RequestType } from 'src/utils/types';
import { CreateSpecializationDto } from './dto/create-specialization.dto';
import { SetUserSpecializationsDto } from './dto/set-user-specializations.dto';
import { UpdateSpecializationDto } from './dto/update-specialization.dto';
import { SpecializationsService } from './specializations.service';

@Controller('specializations')
export class SpecializationsController {
  constructor(private readonly specializationsService: SpecializationsService) {}

  @Get()
  findAll() {
    return this.specializationsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.specializationsService.findOne(id);
  }

  @Post()
  @UseGuards(AuthGuard)
  @Roles(['OWNER', 'SERVER_ADMIN'])
  @UseInterceptors(FileInterceptor('icon'))
  create(@FileValidation({ required: false }) icon: File, @Body() dto: CreateSpecializationDto) {
    return this.specializationsService.create(dto, icon);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  @Roles(['OWNER', 'SERVER_ADMIN'])
  @UseInterceptors(FileInterceptor('icon'))
  update(@FileValidation({ required: false }) icon: File, @Param('id') id: string, @Body() dto: UpdateSpecializationDto) {
    return this.specializationsService.update(id, dto, icon);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @Roles(['OWNER', 'SERVER_ADMIN'])
  delete(@Param('id') id: string) {
    return this.specializationsService.delete(id);
  }

  @Put('users/:userId')
  @UseGuards(AuthGuard)
  setUserSpecializations(@Param('userId') userId: string, @Body() dto: SetUserSpecializationsDto, @Req() req: RequestType) {
    return this.specializationsService.setUserSpecializations(req.userId, userId, dto.specializationIds);
  }
}
