import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { AIService } from './ai.service';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';

// Tool system
import { ToolRegistry } from './tools/tool.registry';
import { ToolsConfig } from './tools/tools.config';

// Tool implementations
import { WebSearchTool } from './tools/implementations/web-search.tool';

// External services
import { TavilyService } from './tools/services/tavily.service';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Message])],
  controllers: [ChatController],
  providers: [
    // Core services
    ChatService,
    AIService,
    
    // Tool system
    ToolRegistry,
    ToolsConfig, // ← This auto-registers tools on startup
    
    // Tool implementations
    WebSearchTool,
    
    // External services
    TavilyService,
  ],
  exports: [ChatService],
})
export class ChatModule {}