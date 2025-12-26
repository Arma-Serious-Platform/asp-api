import { ApiProperty } from "@nestjs/swagger";
import { MissionStatus } from "@prisma/client";
import { IsEnum, IsNotEmpty } from "class-validator";

export class ChangeMissionVersionStatusDto {
  @ApiProperty({
    enum: MissionStatus,
    enumName: 'MissionStatus',
  })
  @IsEnum(MissionStatus)
  @IsNotEmpty()
  status: MissionStatus;
}