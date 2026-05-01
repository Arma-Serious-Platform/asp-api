import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class AssignSlotSquadDto {
  @ApiProperty({
    example: '2a6d7b86-57b4-4ca4-8f87-6aab1fcd8c23',
    description: 'Squad id to assign/unassign for slot',
  })
  @IsString()
  @IsNotEmpty()
  squadId: string;
}
