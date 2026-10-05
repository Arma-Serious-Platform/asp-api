import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

// Only profile links. Email and nickname must not be editable here: the email
// has no confirmation flow, and nicknames go through PATCH /users/me/change-nickname.
export class UpdateMeDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tiktokUrl: string;
}
