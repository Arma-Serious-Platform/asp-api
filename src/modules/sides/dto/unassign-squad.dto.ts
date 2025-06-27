import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";

import { IsUUID } from "class-validator";

export class UnassignSquadDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  sideId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  squadId: string;
}

