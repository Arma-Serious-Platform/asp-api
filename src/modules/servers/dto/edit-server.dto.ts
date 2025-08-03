import { Optional } from "@nestjs/common";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { ServerStatus } from "@prisma/client";
import { IsEnum, IsNotEmpty, IsNumber, IsString } from "class-validator";

export class EditServerDto {
  @ApiPropertyOptional()
  @IsString()
  @Optional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @Optional()
  ip?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @Optional()
  port?: number;

  @IsEnum(ServerStatus)
  @Optional()
  status?: ServerStatus;
}