import { ApiProperty } from '@nestjs/swagger';
import { SquadRole } from '@prisma/client';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpdateSquadMemberRoleDto {
  @ApiProperty({ enum: SquadRole })
  @IsNotEmpty()
  @IsEnum(SquadRole)
  role: SquadRole;
}
