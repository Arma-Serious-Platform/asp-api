import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from 'src/infrastructure/prisma/prisma.module';
import { IslandsController } from './islands.controller';
import { IslandsService } from './islands.service';

@Module({
  imports: [ConfigModule.forRoot(), JwtModule, PrismaModule],
  controllers: [IslandsController],
  providers: [IslandsService],
})
export class IslandsModule {}
