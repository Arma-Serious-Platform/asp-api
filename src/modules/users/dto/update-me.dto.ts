import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString } from "class-validator";

export class UpdateMeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nickname: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  steamId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  telegramUrl: string;
  
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  discordUrl: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  youtubeUrl: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  twitchUrl: string;
}
