import { ApiProperty } from "@nestjs/swagger";
import { State } from "@prisma/client";
import { IsEnum } from "class-validator";

export class ChangeMissionStateDto {
  @ApiProperty({ enum: State })
  @IsEnum(State)
  state: State;
}
