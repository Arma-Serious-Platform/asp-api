import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { SquadsService } from './squads.service';

import { AuthGuard } from 'src/shared/guards/auth.guard';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { CreateSquadDto } from './dto/create-squad.dto';
import { DeleteSquadDto } from './dto/delete-squad.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { InviteToSquadDto } from './dto/invite-to-squad.dto';
import { RequestType } from 'src/utils/types';
import { FindSquadsDto } from './dto/find-squads.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileValidation } from 'src/shared/decorators/file.dectorator';
import { UpdateSquadDto } from './dto/update-squad.dto';
import { KickFromSquadDto } from './dto/kick-from-squad.dto';
import { LeaveSquadDto } from './dto/leave-squad.dto';

@Controller('squads')
export class SquadsController {
  constructor(private readonly squadsService: SquadsService) { }

  @Get()
  findAll(@Query() dto: FindSquadsDto) {
    return this.squadsService.findAll(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.squadsService.findOne(id);
  }

  @UseGuards(AuthGuard)
  @Roles(['OWNER', 'TECH_ADMIN'])
  @UseInterceptors(FileInterceptor('logo'))
  @Post()
  create(@FileValidation() logo: File, @Body() dto: CreateSquadDto) {
    return this.squadsService.create({ ...dto, logo });
  }

  @UseGuards(AuthGuard)
  @Roles(['OWNER', 'TECH_ADMIN'])
  @UseInterceptors(FileInterceptor('logo'))
  @Patch(':id')
  update(@FileValidation({ required: false }) logo: File, @Param('id') id: string, @Body() dto: UpdateSquadDto) {
    return this.squadsService.update(id, { ...dto, logo });
  }

  @UseGuards(AuthGuard)
  @Roles(['OWNER', 'TECH_ADMIN'])
  @Delete(':id')
  delete(@Param() dto: DeleteSquadDto) {
    return this.squadsService.delete(dto.id);
  }

  @UseGuards(AuthGuard)
  @Post('/invite/:userId')
  inviteToSquad(@Param() dto: InviteToSquadDto, @Req() req: RequestType) {
    return this.squadsService.inviteToSquad(dto, req.userId);
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
  @Post('/kick/:userId')
  kickFromSquad(@Param() dto: KickFromSquadDto, @Req() req: RequestType) {
    return this.squadsService.kickFromSquad(dto, req.userId);
  }

  @UseGuards(AuthGuard)
  @Post('/leave')
  leaveFromSquad(@Body() dto: LeaveSquadDto, @Req() req: RequestType) {
    return this.squadsService.leaveFromSquad(req.userId, dto.newLeaderId);
  }

  // @UseGuards(AuthGuard)
  // @Post('/invitations/cancel/:invitationId')
  // cancelInvitation(@Param() dto: AcceptInvitationDto, @Req() req: RequestType) {
  //   return this.squadsService.cancelInvitation(dto.invitationId, req.userId);
  // }
}
