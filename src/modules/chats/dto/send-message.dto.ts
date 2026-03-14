import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsObject, IsUUID } from "class-validator";

export class SendMessageDto {
  @ApiProperty({ type: 'object', description: 'Lexical JSON content', additionalProperties: true })
  @IsObject()
  @IsNotEmpty()
  content: any;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  chatId: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  quoteMessageId?: string;
}
