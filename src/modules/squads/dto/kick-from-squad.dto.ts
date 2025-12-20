import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsUUID } from "class-validator";

export class KickFromSquadDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  userId: string;
}