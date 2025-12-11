import { ApiProperty } from "@nestjs/swagger";
import { isString, IsString } from "class-validator";

export class LoginUserDto {
  @ApiProperty()
  @IsString()
  emailOrNickname: string;

  @ApiProperty()
  @IsString()
  password: string;
}