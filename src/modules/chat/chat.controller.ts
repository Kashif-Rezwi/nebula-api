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
import { ChatRequestDto } from './dto/chat-request.dto';
import type { UIMessage } from 'ai';

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

  // AI SDK v5 Compatible Endpoint
  // Accepts UIMessages and returns SSE stream
  @Post('conversations/:id/messages')
  async sendMessage(
    @Req() req,
    @Param('id') conversationId: string,
    @Body() chatRequest: ChatRequestDto,
    @Res() res: Response,
  ) {
    // Get the AI SDK v5 Response object from service
    const aiResponse = await this.chatService.handleStreamingResponse(
      conversationId,
      req.user.userId,
      chatRequest.messages as UIMessage[],
    );

    // Copy headers from AI SDK response to Express response
    aiResponse.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    // Set status code
    res.status(aiResponse.status);

    // Stream the body
    if (aiResponse.body) {
      const reader = aiResponse.body.getReader();
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
      } finally {
        reader.releaseLock();
      }
    }

    res.end();
  }
}