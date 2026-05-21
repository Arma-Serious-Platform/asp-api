import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from 'src/infrastructure/prisma/prisma.module';
import { RulesController } from './rules.controller';
import { RulesService } from './rules.service';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '3d' },
    }),
  ],
  controllers: [RulesController],
  providers: [RulesService],
})
export class RulesModule {}
