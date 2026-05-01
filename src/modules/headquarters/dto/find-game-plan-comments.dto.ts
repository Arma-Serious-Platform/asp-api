import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Min } from "class-validator";

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
  take?: number = 100;
}
