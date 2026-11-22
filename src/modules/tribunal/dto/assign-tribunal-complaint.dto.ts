import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignTribunalComplaintDto {
  @ApiProperty()
  @IsUUID()
  assigneeId: string;
}
