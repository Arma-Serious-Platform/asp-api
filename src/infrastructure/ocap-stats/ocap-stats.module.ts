import { Module } from '@nestjs/common';
import { OcapStatsService } from './ocap-stats.service';

@Module({
  providers: [OcapStatsService],
  exports: [OcapStatsService],
})
export class OcapStatsModule {}
