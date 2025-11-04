import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { AIService } from './ai.service';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';

// Tool system
import { ToolManager } from './tools/tool-manager.service';
import { ToolRegistration } from './tools/tool-registration.service';

// Tool implementations
import { WebSearchTool } from './tools/implementations/web-search.tool';

// External services
import { TavilyService } from './tools/services/tavily.service';
import { SummaryService } from './tools/services/summary.service';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Message])],
  controllers: [ChatController],
  providers: [
    // Core services
    ChatService,
    AIService,
    
    // Tool system
    ToolManager,
    ToolRegistration,

    // Tool implementations
    WebSearchTool,
    
    // External services
    TavilyService,
    SummaryService,
  ],
  exports: [ChatService],
})
export class ChatModule {}