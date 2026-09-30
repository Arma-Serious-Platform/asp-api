import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { FindPublicListDto } from './find-public-list.dto';

// The feed merges news and weekends and loads skip + take rows of each.
export class FindPublicFeedDto extends FindPublicListDto {
  @ApiPropertyOptional({ maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number = 100;

  @ApiPropertyOptional({ maximum: 1000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  skip?: number = 0;
}
