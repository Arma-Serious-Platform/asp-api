import { Module } from '@nestjs/common';
import { SidesService } from './sides.service';
import { SidesController } from './sides.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [ConfigModule.forRoot(), JwtModule, PrismaModule],
  controllers: [SidesController],
  providers: [SidesService],
})
export class SidesModule {}
