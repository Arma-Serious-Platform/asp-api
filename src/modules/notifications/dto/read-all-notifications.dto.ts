import { ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationGroup } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class ReadAllNotificationsDto {
  @ApiPropertyOptional({ enum: NotificationGroup })
  @IsOptional()
  @IsEnum(NotificationGroup)
  group?: NotificationGroup;
}
