import { BadRequestException, Controller, Get, Post, Param, Body, Query, UseGuards, Req, Delete, Patch, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { Multer } from "multer";
import { ChatsService } from "./chats.service";
import { ChatsGateway } from "./chats.gateway";
import { CreateChatDto } from "./dto/create-chat.dto";
import { SendMessageDto } from "./dto/send-message.dto";
import { UpdateChatDto } from "./dto/update-chat.dto";
import { UpdateMessageDto } from "./dto/update-message.dto";
import { AddChatMembersDto } from "./dto/add-chat-members.dto";
import { PaginationDto } from "src/shared/dto/pagination.dto";
import { AuthGuard } from "src/shared/guards/auth.guard";
import { RequestType } from "src/utils/types";
import { validateAttachmentFiles } from "src/shared/utils/validate-attachments";
import { normalizeJsonValue } from "src/utils/normalize-json-value";

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
    const userIds = chat.users
      .filter((chatUser) => !chatUser.leftAt)
      .map((chatUser) => chatUser.userId);
    this.chatsGateway.joinOnlineUsersToChat(chat.id, userIds);

    return chat;
  }

  @Post(':id/messages')
  @UseInterceptors(FilesInterceptor('attachments', 10))
  async sendMessage(
    @Param('id') chatId: string,
    @UploadedFiles() attachments: Multer.File[],
    @Body() dto: Omit<SendMessageDto, 'chatId'> & Record<string, unknown>,
    @Req() req: RequestType,
  ) {
    validateAttachmentFiles(attachments);

    const rawContent = dto.content ?? dto;
    const content = normalizeJsonValue({ value: rawContent });
    const quoteMessageId = typeof dto.quoteMessageId === 'string' ? dto.quoteMessageId : undefined;

    if (!content || typeof content !== 'object') {
      throw new BadRequestException('Message content is required');
    }

    const message = await this.chatsService.sendMessage(
      {
        chatId,
        quoteMessageId,
        content,
      },
      req.userId,
      attachments,
    );

    this.chatsGateway.emitToChat(chatId, 'new_message', message);

    return message;
  }

  @Patch(':id/messages/:messageId')
  @UseInterceptors(FilesInterceptor('attachments', 10))
  async updateMessage(
    @Param('id') chatId: string,
    @Param('messageId') messageId: string,
    @UploadedFiles() attachments: Multer.File[],
    @Body() dto: UpdateMessageDto & Record<string, unknown>,
    @Req() req: RequestType,
  ) {
    validateAttachmentFiles(attachments);

    const rawContent = dto.content;
    const content = rawContent === undefined ? undefined : normalizeJsonValue({ value: rawContent });

    if (content !== undefined && (typeof content !== 'object' || content === null)) {
      throw new BadRequestException('Message content must be a valid JSON object');
    }

    const message = await this.chatsService.updateMessage(
      chatId,
      messageId,
      {
        ...(content !== undefined && { content }),
        removedAttachmentIds: dto.removedAttachmentIds,
      },
      req.userId,
      attachments,
    );

    this.chatsGateway.emitToChat(chatId, 'message_updated', message);

    return message;
  }

  @Delete(':id/messages/:messageId')
  async deleteMessage(
    @Param('id') chatId: string,
    @Param('messageId') messageId: string,
    @Req() req: RequestType,
  ) {
    const result = await this.chatsService.deleteMessage(chatId, messageId, req.userId);
    this.chatsGateway.emitToChat(chatId, 'message_deleted', result);
    return result;
  }

  @Get(':id/messages')
  findMessages(@Param('id') chatId: string, @Query() query: PaginationDto, @Req() req: RequestType) {
    return this.chatsService.findMessages({ ...query, chatId }, req.userId);
  }

  @Post(':id/members')
  async addMembers(
    @Param('id') chatId: string,
    @Body() dto: AddChatMembersDto,
    @Req() req: RequestType,
  ) {
    const result = await this.chatsService.addMembers(chatId, dto, req.userId);

    if (result.rejoinedUserIds.length > 0) {
      this.chatsGateway.joinOnlineUsersToChat(chatId, result.rejoinedUserIds);
    }

    return result.chat;
  }

  @Delete(':id/leave')
  async leaveChat(@Param('id') id: string, @Req() req: RequestType) {
    const chat = await this.chatsService.findById(id, req.userId);
    const memberUserIds = chat.users
      .filter((chatUser) => !chatUser.leftAt)
      .map((chatUser) => chatUser.userId);
    const result = await this.chatsService.leaveChat(id, req.userId);

    this.chatsGateway.notifyChatLeft(id, req.userId, memberUserIds);

    return result;
  }

  @Delete(':id')
  async deleteChat(@Param('id') id: string, @Req() req: RequestType) {
    const result = await this.chatsService.deleteChat(id, req.userId);

    this.chatsGateway.notifyChatDeleted(id, result.memberUserIds);

    return { message: result.message };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateChatDto, @Req() req: RequestType) {
    const chat = await this.chatsService.update(id, dto, req.userId);

    this.chatsGateway.emitToChat(id, 'chat_updated', chat);

    return chat;
  }
}
