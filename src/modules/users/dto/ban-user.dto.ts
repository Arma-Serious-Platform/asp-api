import { IsDateString, IsString } from "class-validator";

import { IsNotEmpty } from "class-validator";

export class BanUserDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsDateString()
  @IsNotEmpty()
  bannedUntil: string;
}
