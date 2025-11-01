import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { AIService } from './ai.service';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';

// Tool services
import { ToolRegistry } from './tools/tool.registry';
import { ToolExecutorService } from './tools/tool-executor.service';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Message])],
  controllers: [ChatController],
  providers: [
    ChatService,
    AIService,
    ToolRegistry,
    ToolExecutorService,
  ],
  exports: [ChatService],
})
export class ChatModule {}