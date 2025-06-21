import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty } from "class-validator";

export class UnbanUserDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  userId: string;
}

