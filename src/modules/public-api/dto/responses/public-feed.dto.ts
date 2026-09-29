import { ApiProperty } from '@nestjs/swagger';
import { PublicNewsDto } from './public-news.dto';
import { PublicWeekendDto } from './public-weekends.dto';

export class PublicFeedItemDto {
  @ApiProperty({ example: 'f6a7b8c9-d0e1-2345-f012-456789012345' })
  id: string;

  @ApiProperty({ example: 'news', enum: ['news', 'weekends'] })
  type: 'news' | 'weekends';

  @ApiProperty({
    description: 'Full news or weekend object depending on type',
    example: {
      id: 'f6a7b8c9-d0e1-2345-f012-456789012345',
      title: 'Server maintenance complete',
      published: true,
      type: 'INFO',
      date: '2026-09-25T14:00:00.000Z',
    },
  })
  data: PublicNewsDto | PublicWeekendDto;
}

export class PublicFeedListResponseDto {
  @ApiProperty({ type: [PublicFeedItemDto] })
  data: PublicFeedItemDto[];

  @ApiProperty({ example: 99 })
  total: number;

  @ApiProperty({ example: 0 })
  skip: number;

  @ApiProperty({ example: 50 })
  take: number;
}
