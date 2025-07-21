import { Module } from '@nestjs/common';
import { SquadsService } from './squads.service';
import { SquadsController } from './squads.controller';
import { PrismaModule } from 'src/infrastructure/prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [JwtModule, ConfigModule.forRoot(), PrismaModule, UsersModule],
  controllers: [SquadsController],
  providers: [SquadsService],
})
export class SquadsModule { }
