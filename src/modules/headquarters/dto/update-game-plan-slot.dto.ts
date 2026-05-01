import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class UpdateGamePlanSlotDto {
  @ApiPropertyOptional({
    nullable: true,
    example: 'Mechanized Infantry',
    description: 'Display name for the slot',
  })
  @IsOptional()
  @IsString()
  name?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: '2x IFV, 1x logistics truck',
    description: 'Slot weaponry/equipment notes',
  })
  @IsOptional()
  @IsString()
  weaponry?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: 'Need experienced crew and comms discipline',
    description: 'Additional slot comments',
  })
  @IsOptional()
  @IsString()
  comment?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: 'FOB North',
    description: 'Preferred spawn point for the slot',
  })
  @IsOptional()
  @IsString()
  spawnPoint?: string | null;
}
