import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class GetMeDto {
  @ApiProperty()
  @IsString()
  id: string;
}

