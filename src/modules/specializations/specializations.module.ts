import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MinioModule } from 'src/infrastructure/minio/minio.module';
import { PrismaModule } from 'src/infrastructure/prisma/prisma.module';
import { SpecializationsController } from './specializations.controller';
import { SpecializationsService } from './specializations.service';

@Module({
  imports: [JwtModule, PrismaModule, MinioModule],
  controllers: [SpecializationsController],
  providers: [SpecializationsService],
})
export class SpecializationsModule {}
