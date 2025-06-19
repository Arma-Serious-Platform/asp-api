import { Module } from '@nestjs/common';
import { SidesService } from './sides.service';
import { SidesController } from './sides.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot(), PrismaModule],
  controllers: [SidesController],
  providers: [SidesService],
})
export class SidesModule {}
