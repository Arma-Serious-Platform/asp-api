import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ApiKeyGuard } from 'src/shared/guards/api-key.guard';
import { PublicApiThrottlerGuard } from 'src/shared/guards/public-api-throttler.guard';
import { FindPublicListDto } from './dto/find-public-list.dto';
import { FindPublicUsersDto } from './dto/find-public-users.dto';
import { FindPublicWeekendsDto } from './dto/find-public-weekends.dto';
import {
  PublicFeedListResponseDto,
  PublicMissionDetailDto,
  PublicMissionListResponseDto,
  PublicMissionVersionDto,
  PublicMissionVersionSlotsResponseDto,
  PublicNewsDto,
  PublicNewsListResponseDto,
  PublicSideDto,
  PublicSideListResponseDto,
  PublicSquadDetailDto,
  PublicSquadListResponseDto,
  PublicUserDto,
  PublicUserListResponseDto,
  PublicWeekendDto,
  PublicWeekendListResponseDto,
} from './dto/responses';
import { PublicApiService } from './public-api.service';

@ApiTags('public')
@ApiSecurity('X-Api-Key')
@UseGuards(PublicApiThrottlerGuard, ApiKeyGuard)
@Throttle({
  default: {
    ttl: Number(process.env.PUBLIC_API_RATE_TTL ?? 60) * 1000,
    limit: Number(process.env.PUBLIC_API_RATE_LIMIT ?? 60),
  },
})
@Controller('public')
export class PublicApiController {
  constructor(private readonly publicApiService: PublicApiService) {}

  @Get('users')
  @ApiOperation({ summary: 'List users' })
  @ApiOkResponse({ description: 'Paginated users', type: PublicUserListResponseDto })
  findUsers(@Query() dto: FindPublicUsersDto) {
    return this.publicApiService.findUsers(dto);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user by id' })
  @ApiParam({ name: 'id', example: '4c4d0611-9f81-4ffd-b4ce-c8fe8f7f3b8b' })
  @ApiOkResponse({ description: 'User profile', type: PublicUserDto })
  @ApiNotFoundResponse({ description: 'User not found' })
  findUserById(@Param('id') id: string) {
    return this.publicApiService.findUserById(id);
  }

  @Get('weekends')
  @ApiOperation({ summary: 'List weekends' })
  @ApiOkResponse({ description: 'Paginated weekends', type: PublicWeekendListResponseDto })
  findWeekends(@Query() dto: FindPublicWeekendsDto) {
    return this.publicApiService.findWeekends(dto);
  }

  @Get('weekends/:id')
  @ApiOperation({ summary: 'Get weekend by id' })
  @ApiParam({ name: 'id', example: 'd4e5f6a7-b8c9-0123-def0-234567890123' })
  @ApiOkResponse({ description: 'Weekend with games', type: PublicWeekendDto })
  @ApiNotFoundResponse({ description: 'Weekend not found' })
  findWeekendById(@Param('id') id: string) {
    return this.publicApiService.findWeekendById(id);
  }

  @Get('news')
  @ApiOperation({ summary: 'List published news' })
  @ApiOkResponse({ description: 'Paginated news', type: PublicNewsListResponseDto })
  findNews(@Query() dto: FindPublicListDto) {
    return this.publicApiService.findNews(dto);
  }

  @Get('news/:id')
  @ApiOperation({ summary: 'Get published news by id' })
  @ApiParam({ name: 'id', example: 'f6a7b8c9-d0e1-2345-f012-456789012345' })
  @ApiOkResponse({ description: 'News article', type: PublicNewsDto })
  @ApiNotFoundResponse({ description: 'News not found' })
  findNewsById(@Param('id') id: string) {
    return this.publicApiService.findNewsById(id);
  }

  @Get('feed')
  @ApiOperation({ summary: 'Merged news and weekends feed' })
  @ApiOkResponse({ description: 'Paginated feed items', type: PublicFeedListResponseDto })
  findFeed(@Query() dto: FindPublicListDto) {
    return this.publicApiService.findFeed(dto);
  }

  @Get('squads')
  @ApiOperation({ summary: 'List squads' })
  @ApiOkResponse({ description: 'Paginated squads', type: PublicSquadListResponseDto })
  findSquads(@Query() dto: FindPublicListDto) {
    return this.publicApiService.findSquads(dto);
  }

  @Get('squads/:id')
  @ApiOperation({ summary: 'Get squad by id, tag, or name' })
  @ApiParam({ name: 'id', example: '1MEC' })
  @ApiOkResponse({ description: 'Squad with members', type: PublicSquadDetailDto })
  @ApiNotFoundResponse({ description: 'Squad not found' })
  findSquadById(@Param('id') id: string) {
    return this.publicApiService.findSquadById(id);
  }

  @Get('sides')
  @ApiOperation({ summary: 'List sides' })
  @ApiOkResponse({ description: 'Paginated sides', type: PublicSideListResponseDto })
  findSides(@Query() dto: FindPublicListDto) {
    return this.publicApiService.findSides(dto);
  }

  @Get('sides/:id')
  @ApiOperation({ summary: 'Get side by id' })
  @ApiParam({ name: 'id', example: '2a6d7b86-57b4-4ca4-8f87-6aab1fcd8c23' })
  @ApiOkResponse({ description: 'Side with squads', type: PublicSideDto })
  @ApiNotFoundResponse({ description: 'Side not found' })
  findSideById(@Param('id') id: string) {
    return this.publicApiService.findSideById(id);
  }

  @Get('missions')
  @ApiOperation({ summary: 'List missions' })
  @ApiOkResponse({ description: 'Paginated missions', type: PublicMissionListResponseDto })
  findMissions(@Query() dto: FindPublicListDto) {
    return this.publicApiService.findMissions(dto);
  }

  @Get('missions/:id')
  @ApiOperation({ summary: 'Get mission by id' })
  @ApiParam({ name: 'id', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiOkResponse({ description: 'Mission with versions', type: PublicMissionDetailDto })
  @ApiNotFoundResponse({ description: 'Mission not found' })
  findMissionById(@Param('id') id: string) {
    return this.publicApiService.findMissionById(id);
  }

  @Get('missions/:missionId/versions/:versionId')
  @ApiOperation({ summary: 'Get mission version with slot JSON' })
  @ApiParam({ name: 'missionId', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiParam({ name: 'versionId', example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901' })
  @ApiOkResponse({ description: 'Mission version detail', type: PublicMissionVersionDto })
  @ApiNotFoundResponse({ description: 'Mission version not found' })
  findMissionVersion(
    @Param('missionId') missionId: string,
    @Param('versionId') versionId: string,
  ) {
    return this.publicApiService.findMissionVersion(missionId, versionId);
  }

  @Get('missions/:missionId/versions/:versionId/slots')
  @ApiOperation({ summary: 'Get mission version slot layouts only' })
  @ApiParam({ name: 'missionId', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiParam({ name: 'versionId', example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901' })
  @ApiOkResponse({
    description: 'Attack, defense, and friendly slot JSON',
    type: PublicMissionVersionSlotsResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Mission version not found' })
  findMissionVersionSlots(
    @Param('missionId') missionId: string,
    @Param('versionId') versionId: string,
  ) {
    return this.publicApiService.findMissionVersionSlots(missionId, versionId);
  }
}
