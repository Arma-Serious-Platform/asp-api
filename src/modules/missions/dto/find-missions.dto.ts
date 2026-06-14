import { ApiPropertyOptional } from "@nestjs/swagger";
import { MissionStatus, MissionType, State } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";
import { PaginationDto } from "src/shared/dto/pagination.dto";
import { OrderType } from "src/shared/enums/order-type.enum";

export enum MissionOrderBy {
  CREATED_AT = 'createdAt',
}

export class FindMissionsDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  authorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Transform(({ value }) => parseInt(value as string))
  minSlots?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Transform(({ value }) => parseInt(value as string))
  maxSlots?: number;

  @ApiPropertyOptional({ enum: MissionStatus })
  @IsOptional()
  @IsEnum(MissionStatus)
  status?: MissionStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  reviewerId?: string;

  @ApiPropertyOptional({ enum: MissionType })
  @IsOptional()
  @IsEnum(MissionType)
  missionType?: MissionType;

  @ApiPropertyOptional({ enum: State })
  @IsOptional()
  @IsEnum(State)
  state?: State;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  islandId?: string;

  @ApiPropertyOptional({ enum: MissionOrderBy, default: MissionOrderBy.CREATED_AT })
  @IsOptional()
  @IsEnum(MissionOrderBy)
  orderBy?: MissionOrderBy = MissionOrderBy.CREATED_AT;

  @ApiPropertyOptional({ enum: OrderType, default: OrderType.DESC })
  @IsOptional()
  @IsEnum(OrderType)
  orderType?: OrderType = OrderType.DESC;
}