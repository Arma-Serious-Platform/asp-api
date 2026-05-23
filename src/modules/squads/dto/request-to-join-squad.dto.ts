import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class RequestToJoinSquadDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  squadId: string;
}
