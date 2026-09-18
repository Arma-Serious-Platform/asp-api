import { Injectable } from '@nestjs/common';
import { NewsService } from 'src/modules/news/news.service';
import { WeekendsService } from 'src/modules/weekends/weekends.service';
import { FindFeedDto } from './dto/find-feed.dto';

type FeedItemType = 'news' | 'weekends';

type FeedItem = {
  id: string;
  type: FeedItemType;
  data: unknown;
};

@Injectable()
export class FeedService {
  constructor(
    private readonly newsService: NewsService,
    private readonly weekendsService: WeekendsService,
  ) {}

  async findFeed(dto: FindFeedDto, userId?: string) {
    const skip = Number(dto.skip ?? 0);
    const take = Number(dto.take ?? 50);
    const window = skip + take;

    const [newsPage, weekendsPage] = await Promise.all([
      this.newsService.findPublic({ skip: 0, take: window }),
      this.weekendsService.findAll(
        { published: true, skip: 0, take: window },
        userId,
      ),
    ]);

    const newsItems: Array<FeedItem & { sortAt: number }> = newsPage.data.map(
      (item) => ({
        id: item.id,
        type: 'news' as const,
        data: item,
        sortAt: new Date(item.date).getTime(),
      }),
    );

    const weekendItems: Array<FeedItem & { sortAt: number }> =
      weekendsPage.data.map((item) => ({
        id: item.id,
        type: 'weekends' as const,
        data: item,
        sortAt: new Date(item.games?.[0]?.date ?? item.createdAt).getTime(),
      }));

    const merged = [...newsItems, ...weekendItems].sort(
      (a, b) => b.sortAt - a.sortAt,
    );

    const page = merged
      .slice(skip, skip + take)
      .map(({ sortAt: _sortAt, ...item }) => item);

    return {
      data: page,
      total: newsPage.total + weekendsPage.total,
      skip,
      take,
    };
  }
}
