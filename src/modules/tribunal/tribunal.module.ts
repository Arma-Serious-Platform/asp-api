import { Module } from '@nestjs/common';
import { MinioModule } from 'src/infrastructure/minio/minio.module';
import { PrismaModule } from 'src/infrastructure/prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { TribunalController } from './tribunal.controller';
import { TribunalService } from './tribunal.service';

@Module({
  imports: [PrismaModule, UsersModule, MinioModule],
  controllers: [TribunalController],
  providers: [TribunalService],
})
export class TribunalModule {}
