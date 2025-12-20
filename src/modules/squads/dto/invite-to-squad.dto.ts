import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsUUID } from "class-validator";

export class InviteToSquadDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  userId: string;
}
