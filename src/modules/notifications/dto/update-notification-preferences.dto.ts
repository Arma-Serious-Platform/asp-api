import { ApiProperty } from '@nestjs/swagger';
import { NotificationGroup } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  ValidateNested,
} from 'class-validator';

export class NotificationPreferenceItemDto {
  @ApiProperty({ enum: NotificationGroup })
  @IsEnum(NotificationGroup)
  group: NotificationGroup;

  @ApiProperty()
  @IsBoolean()
  enabled: boolean;
}

export class UpdateNotificationPreferencesDto {
  @ApiProperty({ type: [NotificationPreferenceItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => NotificationPreferenceItemDto)
  preferences: NotificationPreferenceItemDto[];
}
