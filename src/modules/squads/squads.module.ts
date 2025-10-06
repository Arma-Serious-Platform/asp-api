import { Module } from '@nestjs/common';
import { SquadsService } from './squads.service';
import { SquadsController } from './squads.controller';
import { PrismaModule } from 'src/infrastructure/prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { MinioModule } from 'src/infrastructure/minio/minio.module';

@Module({
  imports: [
    JwtModule,
    ConfigModule.forRoot(),
    PrismaModule,
    UsersModule,
    MinioModule,
  ],
  controllers: [SquadsController],
  providers: [SquadsService],
})
export class SquadsModule {}
