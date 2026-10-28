import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/infrastructure/prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { OidcClientsController } from './oidc-clients.controller';
import { OidcClientsService } from './oidc-clients.service';
import { OidcConnectedAppsController } from './oidc-connected-apps.controller';
import { OidcConnectedAppsService } from './oidc-connected-apps.service';
import { OidcGrantsService } from './oidc-grants.service';
import { OidcInteractionsController } from './oidc-interactions.controller';
import { OidcInteractionsService } from './oidc-interactions.service';
import { OidcProviderService } from './oidc-provider.service';

@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [
    OidcInteractionsController,
    OidcClientsController,
    OidcConnectedAppsController,
  ],
  providers: [
    OidcProviderService,
    OidcGrantsService,
    OidcConnectedAppsService,
    OidcInteractionsService,
    OidcClientsService,
  ],
  exports: [OidcProviderService],
})
export class OidcModule {}
