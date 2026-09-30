import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsUUID } from "class-validator";

export class LeaveSquadDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  newLeaderId?: string;
}