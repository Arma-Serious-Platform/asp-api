import { UserRole } from '@prisma/client';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangeUserRoleDto {
  @IsUUID()
  id: string;

  @ApiProperty({
    isArray: true,
    enum: UserRole,
    enumName: 'UserRole',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(UserRole, { each: true })
  roles: UserRole[];
}
