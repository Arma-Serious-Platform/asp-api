import { ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationGroup } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationDto } from 'src/shared/dto/pagination.dto';

export class FindNotificationsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: NotificationGroup })
  @IsOptional()
  @IsEnum(NotificationGroup)
  group?: NotificationGroup;
}
