import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignSquadToSideDto {
  @ApiProperty()
  @IsUUID()
  squadId: string;

  @ApiProperty()
  @IsUUID()
  sideId: string;
}