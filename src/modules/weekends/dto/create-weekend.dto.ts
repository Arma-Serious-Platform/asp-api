import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsArray, ValidateNested, ArrayMinSize, IsBoolean, IsOptional, IsInt, Min, IsDateString, ValidateIf } from "class-validator";
import { Type } from "class-transformer";

export class CreateGameDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  date: string; // ISO date string

  @ApiProperty()
  @IsInt()
  @Min(0)
  position: number;

  @ApiProperty({ description: 'Mission id – the mission this game uses' })
  @IsString()
  @IsNotEmpty()
  missionId: string;

  @ApiProperty({ description: 'Mission version id – must belong to the selected mission' })
  @IsString()
  @IsNotEmpty()
  missionVersionId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  attackSideId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  defenseSideId: string;

  @ApiPropertyOptional({ description: 'User id of the game admin (optional, null by default)' })
  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsString()
  adminId?: string | null;
}

export class CreateWeekendDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

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
