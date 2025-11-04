import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ToolManager } from './tool-manager.service';
import { WebSearchTool } from './implementations/web-search.tool';

@Injectable()
export class ToolRegistration implements OnModuleInit {
  private readonly logger = new Logger(ToolRegistration.name);

  constructor(
    private readonly toolManager: ToolManager,
    private readonly webSearchTool: WebSearchTool,
  ) {}

  // This runs automatically when the app starts
  onModuleInit() {
    this.logger.log('🔧 Registering tools...');

    try {
      // Register web search tool
      this.toolManager.register(
        'web_search',
        this.webSearchTool.getDefinition(),
      );

      this.logger.log(`✅ Registered ${this.toolManager.count()} tool(s)`);
    } catch (error: any) {
      this.logger.error(`❌ Tool registration failed: ${error.message}`);
      throw error;
    }
  }
}