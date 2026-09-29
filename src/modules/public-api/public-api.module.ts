import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from 'src/infrastructure/prisma/prisma.module';
import { ApiKeysModule } from 'src/modules/api-keys/api-keys.module';
import { ApiKeyGuard } from 'src/shared/guards/api-key.guard';
import { PublicApiThrottlerGuard } from 'src/shared/guards/public-api-throttler.guard';
import { PublicApiController } from './public-api.controller';
import { PublicApiService } from './public-api.service';

@Module({
  imports: [
    PrismaModule,
    ApiKeysModule,
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: Number(process.env.PUBLIC_API_RATE_TTL ?? 60) * 1000,
        limit: Number(process.env.PUBLIC_API_RATE_LIMIT ?? 60),
      },
    ]),
  ],
  controllers: [PublicApiController],
  providers: [PublicApiService, ApiKeyGuard, PublicApiThrottlerGuard],
})
export class PublicApiModule {}
