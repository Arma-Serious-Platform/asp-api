import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BotNotificationType, State } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateBotNotificationDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @ApiProperty({ enum: BotNotificationType })
  @IsEnum(BotNotificationType)
  type: BotNotificationType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  telegramToken?: string | null;

  @ApiPropertyOptional({
    description: 'Telegram chat/channel id, or "*" to send to every chat the bot can reach',
  })
  @IsOptional()
  @IsString()
  telegramChannelId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  discordToken?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  discordChannelId?: string | null;

  @ApiPropertyOptional({ enum: State })
  @IsOptional()
  @IsEnum(State)
  status?: State;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  url?: string | null;
}
