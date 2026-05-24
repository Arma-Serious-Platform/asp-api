import { ApiPropertyOptional } from "@nestjs/swagger";
import { SquadRole } from "@prisma/client";
import { IsIn, IsOptional } from "class-validator";

export class InviteToSquadBodyDto {
  @ApiPropertyOptional({ enum: [SquadRole.MEMBER, SquadRole.HQ, SquadRole.RECRUIT] })
  @IsOptional()
  @IsIn([SquadRole.MEMBER, SquadRole.HQ, SquadRole.RECRUIT])
  squadRole?: SquadRole;
}
