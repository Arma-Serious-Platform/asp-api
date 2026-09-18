import { Module } from '@nestjs/common';
import { NewsModule } from 'src/modules/news/news.module';
import { WeekendsModule } from 'src/modules/weekends/weekends.module';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';

@Module({
  imports: [NewsModule, WeekendsModule],
  controllers: [FeedController],
  providers: [FeedService],
})
export class FeedModule {}
