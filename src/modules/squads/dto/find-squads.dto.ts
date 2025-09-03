import { ApiPropertyOptional } from '@nestjs/swagger';
import { SideType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from 'src/shared/dto/pagination.dto';

export class FindSquadsDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @IsEnum(SideType)
  sideType?: SideType;
}
