import { Controller, Get, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from 'src/modules/auth/auth.service';
import { FindFeedDto } from './dto/find-feed.dto';
import { FeedService } from './feed.service';

@Controller('feed')
export class FeedController {
  constructor(
    private readonly feedService: FeedService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  async findFeed(@Query() dto: FindFeedDto, @Req() req: Request) {
    const authUser = await this.authService.resolveRequestUser(req);
    return this.feedService.findFeed(dto, authUser?.userId);
  }
}
