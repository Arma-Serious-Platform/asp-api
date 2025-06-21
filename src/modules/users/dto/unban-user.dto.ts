import { IsDateString, IsString } from "class-validator";

import { IsNotEmpty } from "class-validator";

export class UnbanUserDto {
  @IsString()
  @IsNotEmpty()
  userId: string;
}

