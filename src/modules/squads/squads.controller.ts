import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { SquadsService } from './squads.service';

import { AuthGuard } from 'src/shared/guards/auth.guard';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { CreateSquadDto } from './dto/create-squad.dto';
import { DeleteSquadDto } from './dto/delete-squad.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { InviteToSquadDto } from './dto/invite-to-squad.dto';
import { RequestType } from 'src/utils/types';

@Controller('squads')
export class SquadsController {
  constructor(private readonly squadsService: SquadsService) { }

  @Get()
  findAll() {
    return this.squadsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.squadsService.findOne(id);
  }

  @UseGuards(AuthGuard)
  @Roles(['OWNER', 'TECH_ADMIN'])
  @Post()
  create(@Body() dto: CreateSquadDto) {
    return this.squadsService.create(dto);
  }

  @UseGuards(AuthGuard)
  @Roles(['OWNER', 'TECH_ADMIN'])
  @Delete(':id')
  delete(@Param() dto: DeleteSquadDto) {
    return this.squadsService.delete(dto.id);
  }

  @UseGuards(AuthGuard)
  @Post('/my/invitations/:userId')
  inviteToSquad(@Param() dto: InviteToSquadDto, @Req() req: RequestType) {
    return this.squadsService.inviteToSquad(dto, req.userId);
  }

  @UseGuards(AuthGuard)
  @Get('/my/invitations')
  getMySquadInvitations(@Req() req: RequestType) {
    return this.squadsService.getMyInvitations(req.userId);
  }

  @UseGuards(AuthGuard)
  @Get('/invitations')
  getInvitations(@Req() req: RequestType) {
    return this.squadsService.getMyInvitations(req.userId);
  }

  @UseGuards(AuthGuard)
  @Post('/invitations/accept/:invitationId')
  acceptInvitation(@Param() dto: AcceptInvitationDto, @Req() req: RequestType) {
    return this.squadsService.acceptInvitation(dto.invitationId, req.userId);
  }

  @UseGuards(AuthGuard)
  @Post('/invitations/reject/:invitationId')
  rejectInvitation(@Param() dto: AcceptInvitationDto, @Req() req: RequestType) {
    return this.squadsService.rejectInvitation(dto.invitationId, req.userId);
  }

  @UseGuards(AuthGuard)
  @Post('/invitations/cancel/:invitationId')
  cancelInvitation(@Param() dto: AcceptInvitationDto, @Req() req: RequestType) {
    return this.squadsService.cancelInvitation(dto.invitationId, req.userId);
  }
}
