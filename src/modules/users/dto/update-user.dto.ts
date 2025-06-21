import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsString } from "class-validator";

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsString()
  nickname: string;

  @ApiPropertyOptional()
  @IsEmail()
  email: string;
}
