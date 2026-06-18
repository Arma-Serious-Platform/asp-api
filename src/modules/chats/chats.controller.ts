import { Controller, Get, Post, Param, Body, Query, UseGuards, Req, Delete, Patch } from "@nestjs/common";
import { ChatsService } from "./chats.service";
import { ChatsGateway } from "./chats.gateway";
import { CreateChatDto } from "./dto/create-chat.dto";
import { SendMessageDto } from "./dto/send-message.dto";
import { FindMessagesDto } from "./dto/find-messages.dto";
import { UpdateChatDto } from "./dto/update-chat.dto";
import { AuthGuard } from "src/shared/guards/auth.guard";
import { RequestType } from "src/utils/types";

@Controller('chats')
@UseGuards(AuthGuard)
export class ChatsController {
  constructor(
    private readonly chatsService: ChatsService,
    private readonly chatsGateway: ChatsGateway,
  ) {}

  @Get()
  findAll(@Req() req: RequestType) {
    return this.chatsService.findAll(req.userId);
  }

  @Get(':id')
  findById(@Param('id') id: string, @Req() req: RequestType) {
    return this.chatsService.findById(id, req.userId);
  }

  @Post()
  async create(@Body() dto: CreateChatDto, @Req() req: RequestType) {
    const chat = await this.chatsService.create(dto, req.userId);
    const userIds = chat.users.map((chatUser) => chatUser.userId);
    this.chatsGateway.joinOnlineUsersToChat(chat.id, userIds);

    return chat;
  }

  @Post(':id/messages')
  async sendMessage(@Param('id') chatId: string, @Body() dto: Omit<SendMessageDto, 'chatId'> & Record<string, unknown>, @Req() req: RequestType) {
    const { content, quoteMessageId, ...rawContent } = dto;

    const message = await this.chatsService.sendMessage(
      {
        chatId,
        quoteMessageId,
        content: content ?? rawContent,
      },
      req.userId,
    );

    this.chatsGateway.emitToChat(chatId, 'new_message', message);

    return message;
  }

  @Get(':id/messages')
  findMessages(@Param('id') chatId: string, @Query() dto: Omit<FindMessagesDto, 'chatId'>, @Req() req: RequestType) {
    return this.chatsService.findMessages({ ...dto, chatId }, req.userId);
  }

  @Delete(':id/leave')
  leaveChat(@Param('id') id: string, @Req() req: RequestType) {
    return this.chatsService.leaveChat(id, req.userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateChatDto, @Req() req: RequestType) {
    return this.chatsService.update(id, dto, req.userId);
  }
}
