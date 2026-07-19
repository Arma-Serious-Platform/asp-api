import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from 'src/infrastructure/prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { MinioModule } from 'src/infrastructure/minio/minio.module';
import { UsersHistoryService } from './users-history.service';
import { UsersBanExpirationService } from './users-ban-expiration.service';
import { UserRestrictionsService } from './user-restrictions.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
    PrismaModule,
    MinioModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '3d' },
    }),
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    UsersHistoryService,
    UsersBanExpirationService,
    UserRestrictionsService,
  ],
  exports: [UsersService, UsersHistoryService, UserRestrictionsService],
})
export class UsersModule {}
