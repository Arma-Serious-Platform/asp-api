import { Controller, Delete, Get, Param, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/shared/guards/auth.guard';
import { TrustedOriginGuard } from 'src/shared/guards/trusted-origin.guard';
import { RequestType } from 'src/utils/types';
import { OidcConnectedAppsService } from './oidc-connected-apps.service';

@ApiTags('sso')
@Controller('sso/connected-apps')
@UseGuards(TrustedOriginGuard, AuthGuard)
export class OidcConnectedAppsController {
  constructor(private readonly connectedApps: OidcConnectedAppsService) {}

  @Get()
  findAll(@Req() req: RequestType) {
    return this.connectedApps.list(req.userId);
  }

  @Delete(':clientId')
  revoke(@Param('clientId') clientId: string, @Req() req: RequestType) {
    return this.connectedApps.revoke(req.userId, clientId);
  }
}
