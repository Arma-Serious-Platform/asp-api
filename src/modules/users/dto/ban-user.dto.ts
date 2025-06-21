import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsString } from "class-validator";

import { IsNotEmpty } from "class-validator";

export class BanUserDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  bannedUntil: string;
}
