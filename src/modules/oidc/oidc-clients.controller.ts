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
import { TrustedOriginGuard } from 'src/shared/guards/trusted-origin.guard';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { RequestType } from 'src/utils/types';
import { CreateOidcClientDto } from './dto/create-oidc-client.dto';
import { UpdateOidcClientDto } from './dto/update-oidc-client.dto';
import { OidcClientsService } from './oidc-clients.service';

@ApiTags('sso')
@Controller('sso/clients')
@UseGuards(TrustedOriginGuard, AuthGuard)
export class OidcClientsController {
  constructor(private readonly clients: OidcClientsService) {}

  @Get()
  @Roles(['OWNER', 'SERVER_ADMIN'])
  findAll() {
    return this.clients.findAll();
  }

  @Post()
  @Roles(['OWNER', 'SERVER_ADMIN'])
  create(@Body() dto: CreateOidcClientDto, @Req() req: RequestType) {
    return this.clients.create(dto, req.userId);
  }

  @Patch(':id')
  @Roles(['OWNER', 'SERVER_ADMIN'])
  update(@Param('id') id: string, @Body() dto: UpdateOidcClientDto) {
    return this.clients.update(id, dto);
  }

  @Post(':id/rotate-secret')
  @Roles(['OWNER', 'SERVER_ADMIN'])
  rotateSecret(@Param('id') id: string) {
    return this.clients.rotateSecret(id);
  }

  @Delete(':id')
  @Roles(['OWNER', 'SERVER_ADMIN'])
  delete(@Param('id') id: string) {
    return this.clients.delete(id);
  }
}
