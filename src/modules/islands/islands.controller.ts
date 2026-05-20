import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IslandsService } from './islands.service';
import { AuthGuard } from 'src/shared/guards/auth.guard';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { CreateIslandDto } from './dto/create-island.dto';
import { UpdateIslandDto } from './dto/update-island.dto';
import { FindIslandsDto } from './dto/find-islands.dto';

@Controller('islands')
export class IslandsController {
  constructor(private readonly islandsService: IslandsService) {}

  @UseGuards(AuthGuard)
  @Roles(['OWNER', 'SERVER_ADMIN', 'TECH_ADMIN'])
  @Get()
  findAll(@Query() dto: FindIslandsDto) {
    return this.islandsService.findAll(dto);
  }

  @UseGuards(AuthGuard)
  @Roles(['OWNER', 'SERVER_ADMIN', 'TECH_ADMIN'])
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.islandsService.findOne(id);
  }

  @UseGuards(AuthGuard)
  @Roles(['OWNER', 'SERVER_ADMIN', 'TECH_ADMIN'])
  @Post()
  create(@Body() dto: CreateIslandDto) {
    return this.islandsService.create(dto);
  }

  @UseGuards(AuthGuard)
  @Roles(['OWNER', 'SERVER_ADMIN', 'TECH_ADMIN'])
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateIslandDto) {
    return this.islandsService.update(id, dto);
  }

  @UseGuards(AuthGuard)
  @Roles(['OWNER', 'SERVER_ADMIN', 'TECH_ADMIN'])
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.islandsService.remove(id);
  }
}
