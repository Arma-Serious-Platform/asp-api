import { IsNotEmpty, IsString, IsUUID } from "class-validator";

export class AssignLeaderDto {
  @IsNotEmpty()
  @IsUUID()
  sideId: string;

  @IsNotEmpty()
  @IsUUID()
  leaderId: string;
}
