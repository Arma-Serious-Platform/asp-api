import { ApiPropertyOptional } from "@nestjs/swagger";
import { ServerStatus } from "@prisma/client";
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class EditServerDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  ip?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  port?: number;

  @IsEnum(ServerStatus)
  @IsOptional()
  status?: ServerStatus;
}