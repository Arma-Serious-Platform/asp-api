import { IsEnum, IsNotEmpty, IsNumber } from "class-validator";

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString } from "class-validator";
import { ServerStatus } from "@prisma/client";
import { Optional } from "@nestjs/common";
import { Type } from "class-transformer";

export class CreateServerDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsEnum(ServerStatus)
  @Optional()
  status: ServerStatus;

  @ApiPropertyOptional()
  @IsString()
  @Optional()
  ip?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @Type(() => Number)
  @Optional()
  port?: number;
}


