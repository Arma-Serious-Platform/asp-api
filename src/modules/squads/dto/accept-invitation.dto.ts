import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsUUID } from "class-validator";

export class AcceptInvitationDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  invitationId: string;
}
