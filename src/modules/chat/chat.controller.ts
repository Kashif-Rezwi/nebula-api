import {
    Controller,
    Post,
    Get,
    Delete,
    Body,
    Param,
    UseGuards,
    Req,
    Res,
    HttpCode,
    HttpStatus,
  } from '@nestjs/common';
  import type { Response } from 'express';
  import { ChatService } from './chat.service';
  import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
  import { CreateConversationDto } from './dto/create-conversation.dto';
  import { SendMessageDto } from './dto/send-message.dto';
  
  @Controller('chat')
  @UseGuards(JwtAuthGuard)
  export class ChatController {
    constructor(private chatService: ChatService) {}
  
    @Post('conversations')
    async createConversation(
      @Req() req,
      @Body() createConversationDto: CreateConversationDto,
    ) {
      return this.chatService.createConversation(
        req.user.userId,
        createConversationDto,
      );
    }
  
    @Get('conversations')
    async getConversations(@Req() req) {
      return this.chatService.getUserConversations(req.user.userId);
    }
  
    @Get('conversations/:id')
    async getConversation(@Req() req, @Param('id') id: string) {
      return this.chatService.getConversation(id, req.user.userId);
    }
  
    @Delete('conversations/:id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteConversation(@Req() req, @Param('id') id: string) {
      await this.chatService.deleteConversation(id, req.user.userId);
    }
  
    @Post('conversations/:id/messages')
    async sendMessage(
      @Req() req,
      @Param('id') conversationId: string,
      @Body() sendMessageDto: SendMessageDto,
      @Res() res: Response,
    ) {
      try {
        // Set headers for SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const stream = this.chatService.streamChatResponse(
          conversationId,
          req.user.userId,
          sendMessageDto.message,
        );

        for await (const chunk of stream) {
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }

        res.end();
      } catch (error) {
        res.status(error.status || 500).json({
          error: error.message || 'Failed to process message',
        });
      }
    }
  }