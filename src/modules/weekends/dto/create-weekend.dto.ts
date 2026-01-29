import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsArray, ValidateNested, ArrayMinSize, IsBoolean, IsOptional, IsInt, Min, IsDateString } from "class-validator";
import { Type } from "class-transformer";

export class CreateGameDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  date: string; // ISO date string

  @ApiProperty()
  @IsInt()
  @Min(0)
  position: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  missionId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  attackSideId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  defenseSideId: string;
}

export class CreateWeekendDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  published?: boolean;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  publishedAt?: string;

  @ApiProperty({ type: [CreateGameDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one game is required to create a weekend' })
  @ValidateNested({ each: true })
  @Type(() => CreateGameDto)
  games: CreateGameDto[];
}
