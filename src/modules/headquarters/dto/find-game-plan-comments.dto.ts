import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { PAGINATION_MAX_TAKE } from 'src/shared/dto/pagination.dto';

export class FindGamePlanCommentsDto {
  @ApiPropertyOptional({
    example: '8f147f45-56f0-4bb4-a88d-eaf2be3f3437',
    description: 'Filter by reply target comment id',
  })
  @IsOptional()
  @IsString()
  replyId?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number = 0;

  @ApiPropertyOptional({ default: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PAGINATION_MAX_TAKE)
  take?: number = 100;
}
