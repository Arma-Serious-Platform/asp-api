import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

import { IsNotEmpty } from "class-validator";

export class DeleteSquadDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  id: string;
}
