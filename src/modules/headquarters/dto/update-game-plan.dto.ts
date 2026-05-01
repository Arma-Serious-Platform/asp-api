import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class UpdateGamePlanDto {
  @ApiPropertyOptional({
    nullable: true,
    example: 'https://drive.google.com/file/d/123456789/view',
    description: 'Optional plan link, set null to clear',
  })
  @IsOptional()
  @IsString()
  planUrl?: string | null;
}
