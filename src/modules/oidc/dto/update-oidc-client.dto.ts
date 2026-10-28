import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { OIDC_CLIENT_SCOPES, OidcClientScope } from '../oidc.constants';

export class UpdateOidcClientDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  redirectUris?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  postLogoutRedirectUris?: string[];

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  backchannelLogoutUri?: string | null;

  @ApiPropertyOptional({ enum: OIDC_CLIENT_SCOPES, isArray: true })
  @IsOptional()
  @IsArray()
  @IsIn(OIDC_CLIENT_SCOPES, { each: true })
  allowedScopes?: OidcClientScope[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  firstParty?: boolean;

  @ApiPropertyOptional({
    description: 'A disabled client cannot sign anybody in; its sessions are ended',
  })
  @IsOptional()
  @IsBoolean()
  disabled?: boolean;
}
