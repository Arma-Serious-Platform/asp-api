import { Optional } from "@nestjs/common";
import { ServerStatus } from "@prisma/client";
import { IsEnum, IsNotEmpty, IsNumber, IsString } from "class-validator";

export class EditServerDto {
  @IsString()
  @Optional()
  name?: string;

  @IsString()
  @Optional()
  ip?: string;

  @IsNumber()
  @Optional()
  port?: number;

  @IsEnum(ServerStatus)
  @Optional()
  status?: ServerStatus;
}