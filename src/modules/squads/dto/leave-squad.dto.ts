import { Optional } from "@nestjs/common";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsUUID } from "class-validator";

export class LeaveSquadDto {
  @ApiPropertyOptional()
  @Optional()
  @IsUUID()
  newLeaderId: string;
}