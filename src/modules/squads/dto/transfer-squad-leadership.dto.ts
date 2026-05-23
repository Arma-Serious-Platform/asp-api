import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class TransferSquadLeadershipDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  userId: string;
}
