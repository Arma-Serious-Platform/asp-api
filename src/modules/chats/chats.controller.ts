import { Controller, Get, Post, Param, Body, Query, UseGuards, Req, Delete } from "@nestjs/common";
import { ChatsService } from "./chats.service";
import { CreateChatDto } from "./dto/create-chat.dto";
import { SendMessageDto } from "./dto/send-message.dto";
import { FindMessagesDto } from "./dto/find-messages.dto";
import { AuthGuard } from "src/shared/guards/auth.guard";
import { RequestType } from "src/utils/types";

@Controller('chats')
@UseGuards(AuthGuard)
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  @Get()
  findAll(@Req() req: RequestType) {
    return this.chatsService.findAll(req.userId);
  }

  @Get(':id')
  findById(@Param('id') id: string, @Req() req: RequestType) {
    return this.chatsService.findById(id, req.userId);
  }

  @Post()
  create(@Body() dto: CreateChatDto, @Req() req: RequestType) {
    return this.chatsService.create(dto, req.userId);
  }

  @Post(':id/messages')
  sendMessage(@Param('id') chatId: string, @Body() dto: Omit<SendMessageDto, 'chatId'>, @Req() req: RequestType) {
    return this.chatsService.sendMessage({ ...dto, chatId }, req.userId);
  }

  @Get(':id/messages')
  findMessages(@Param('id') chatId: string, @Query() dto: Omit<FindMessagesDto, 'chatId'>, @Req() req: RequestType) {
    return this.chatsService.findMessages({ ...dto, chatId }, req.userId);
  }

  @Delete(':id/leave')
  leaveChat(@Param('id') id: string, @Req() req: RequestType) {
    return this.chatsService.leaveChat(id, req.userId);
  }
}
