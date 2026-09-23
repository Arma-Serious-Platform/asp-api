import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

const toBooleanDefaultTrue = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') {
    return true;
  }
  return value === 'true' || value === true;
};

export class AnnounceChannelsDto {
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Transform(toBooleanDefaultTrue)
  @IsBoolean()
  telegram?: boolean = true;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Transform(toBooleanDefaultTrue)
  @IsBoolean()
  discord?: boolean = true;
}
