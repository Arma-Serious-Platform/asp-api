import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
} from 'class-validator';
import { OIDC_CLIENT_SCOPES, OidcClientScope } from '../oidc.constants';

export class CreateOidcClientDto {
  @ApiProperty({ description: 'Shown to users on the consent screen' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  @ApiProperty({ type: [String], example: ['https://app.example.com/callback'] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  redirectUris: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  postLogoutRedirectUris?: string[];

  @ApiPropertyOptional({
    description: 'Receives logout tokens when a user is signed out or loses access',
  })
  @IsOptional()
  @IsString()
  backchannelLogoutUri?: string;

  @ApiProperty({ enum: OIDC_CLIENT_SCOPES, isArray: true })
  @IsArray()
  @IsIn(OIDC_CLIENT_SCOPES, { each: true })
  allowedScopes: OidcClientScope[];

  @ApiPropertyOptional({
    description: 'Our own application: no consent screen',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  firstParty?: boolean;

  @ApiPropertyOptional({
    description:
      'Server-side application holding a client secret. False for browser or mobile apps, which use PKCE only.',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  confidential?: boolean;
}
