import { IsNotEmpty, IsUUID } from "class-validator";

export class GetMyInvitationsDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;
}

