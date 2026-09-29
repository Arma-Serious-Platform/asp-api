import { IsEnum, IsNotEmpty, IsNumber, IsOptional } from "class-validator";

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString } from "class-validator";
import { ServerStatus } from "@prisma/client";
import { Type } from "class-transformer";

export class CreateServerDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsEnum(ServerStatus)
  @IsOptional()
  status?: ServerStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  ip?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  port?: number;
}


