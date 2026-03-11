import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ChatType } from "@prisma/client";
import { IsArray, IsEnum, IsOptional, IsString, IsUUID, ArrayMinSize } from "class-validator";

export class CreateChatDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ enum: ChatType, default: ChatType.DIRECT })
  @IsEnum(ChatType)
  type: ChatType;

  @ApiProperty({ type: [String], description: 'Array of user IDs to add to the chat' })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  userIds: string[];
}
