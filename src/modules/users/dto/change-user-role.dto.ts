import { ApiBody, ApiProperty } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { IsEnum, IsUUID } from "class-validator";

export class ChangeUserRoleDto {
  @ApiProperty()
  @IsUUID()
  id: string;

  @ApiProperty({
    enum: UserRole,
    enumName: 'UserRole',
  })
  @IsEnum(UserRole)
  role: UserRole;
}

