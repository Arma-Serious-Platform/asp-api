import { ApiProperty } from '@nestjs/swagger';
import { NewsType } from '@prisma/client';
import { PUBLIC_LEXICAL_JSON_EXAMPLE, PublicAuthorDto, PublicFileDto } from './public-common.dto';

class PublicNewsAttachmentDto {
  @ApiProperty({ example: 'e5f6a7b8-c9d0-1234-ef01-345678901234' })
  id: string;

  @ApiProperty({ example: 'briefing.pdf' })
  originalName: string;

  @ApiProperty({ example: 'application/pdf', nullable: true })
  mimeType: string | null;

  @ApiProperty({ type: PublicFileDto })
  file: PublicFileDto;
}

export class PublicNewsDto {
  @ApiProperty({ example: 'f6a7b8c9-d0e1-2345-f012-456789012345' })
  id: string;

  @ApiProperty({ example: 'Server maintenance complete' })
  title: string;

  @ApiProperty({
    description: 'Lexical editor JSON',
    example: PUBLIC_LEXICAL_JSON_EXAMPLE,
    nullable: true,
  })
  shortDescription: object | null;

  @ApiProperty({
    description: 'Lexical editor JSON',
    example: PUBLIC_LEXICAL_JSON_EXAMPLE,
  })
  content: object;

  @ApiProperty({ example: true })
  published: boolean;

  @ApiProperty({ example: 'INFO', enum: NewsType })
  type: NewsType;

  @ApiProperty({ example: '2026-09-25T14:00:00.000Z' })
  date: string;

  @ApiProperty({ example: '2026-09-25T14:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-09-26T09:00:00.000Z' })
  updatedAt: string;

  @ApiProperty({ type: PublicAuthorDto })
  author: PublicAuthorDto;

  @ApiProperty({ type: PublicFileDto, nullable: true })
  image: PublicFileDto | null;

  @ApiProperty({ type: [PublicNewsAttachmentDto] })
  attachments: PublicNewsAttachmentDto[];
}

export class PublicNewsListResponseDto {
  @ApiProperty({ type: [PublicNewsDto] })
  data: PublicNewsDto[];

  @ApiProperty({ example: 87 })
  total: number;

  @ApiProperty({ example: 0 })
  skip: number;

  @ApiProperty({ example: 50 })
  take: number;
}
