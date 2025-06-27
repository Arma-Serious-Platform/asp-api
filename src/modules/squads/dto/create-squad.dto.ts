import { Optional } from "@nestjs/common";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDefined, IsNotEmpty, IsNumber, IsString, IsUUID } from "class-validator";

export class CreateSquadDto {
  @ApiProperty()
  @IsDefined()
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsDefined()
  @IsNotEmpty()
  @IsString()
  tag: string;

  @ApiPropertyOptional()
  @Optional()
  @IsString()
  description: string;

  @ApiProperty()
  @IsDefined()
  @IsNotEmpty()
  @IsString()
  leaderId: string;

  @ApiProperty()
  @IsDefined()
  @IsNotEmpty()
  @IsUUID()
  sideId: string;

  @ApiPropertyOptional()
  @Optional()
  @IsString()
  logoUrl: string;

  @ApiPropertyOptional()
  @Optional()
  @IsNumber()
  activeCount: number;
}