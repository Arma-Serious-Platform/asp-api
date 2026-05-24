import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { SquadRole } from "@prisma/client";
import { IsIn, IsNotEmpty, IsOptional, IsUUID } from "class-validator";

export class InviteToSquadDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({ enum: [SquadRole.MEMBER, SquadRole.HQ, SquadRole.RECRUIT] })
  @IsOptional()
  @IsIn([SquadRole.MEMBER, SquadRole.HQ, SquadRole.RECRUIT])
  squadRole?: SquadRole;
}
