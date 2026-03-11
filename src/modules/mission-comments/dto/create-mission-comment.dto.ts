import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsObject, IsUUID } from "class-validator";

export class CreateMissionCommentDto {
  @ApiProperty({ required: true, description: 'Lexical JSON content' })
  @IsObject()
  @IsNotEmpty()
  message: any;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  missionId: string;
}
