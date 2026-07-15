import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsNotEmpty, IsOptional, IsObject, IsUUID } from "class-validator";
import { normalizeJsonValue } from "src/utils/normalize-json-value";

export class SendMessageDto {
  @ApiProperty({ type: 'object', description: 'Lexical JSON content', additionalProperties: true })
  @Transform(normalizeJsonValue)
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
