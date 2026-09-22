import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MinioModule } from 'src/infrastructure/minio/minio.module';
import { PrismaModule } from 'src/infrastructure/prisma/prisma.module';
import { AchievementsController } from './achievements.controller';
import { AchievementsService } from './achievements.service';

@Module({
  imports: [JwtModule, PrismaModule, MinioModule],
  controllers: [AchievementsController],
  providers: [AchievementsService],
})
export class AchievementsModule {}
