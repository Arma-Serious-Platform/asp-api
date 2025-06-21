import { IsEnum, IsNotEmpty } from "class-validator";

import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";
import { ServerStatus } from "@prisma/client";
import { Optional } from "@nestjs/common";

export class CreateServerDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsEnum(ServerStatus)
  @Optional()
  status: ServerStatus;
}


