import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/shared/guards/auth.guard';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { RequestType } from 'src/utils/types';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';

@ApiTags('api-keys')
@Controller('api-keys')
@UseGuards(AuthGuard)
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Get()
  @Roles(['OWNER', 'SERVER_ADMIN'])
  findAll() {
    return this.apiKeysService.findAll();
  }

  @Post()
  @Roles(['OWNER', 'SERVER_ADMIN'])
  create(@Body() dto: CreateApiKeyDto, @Req() req: RequestType) {
    return this.apiKeysService.create(dto, req.userId);
  }

  @Patch(':id')
  @Roles(['OWNER', 'SERVER_ADMIN'])
  update(@Param('id') id: string, @Body() dto: UpdateApiKeyDto) {
    return this.apiKeysService.update(id, dto);
  }

  @Delete(':id')
  @Roles(['OWNER', 'SERVER_ADMIN'])
  delete(@Param('id') id: string) {
    return this.apiKeysService.delete(id);
  }
}
