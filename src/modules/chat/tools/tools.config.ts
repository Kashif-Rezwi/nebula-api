import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ToolRegistry } from './tool.registry';
import { WebSearchTool } from './implementations/web-search.tool';

// Configuration class that registers all tools on module initialization, runs automatically when the ChatModule starts
@Injectable()
export class ToolsConfig implements OnModuleInit {
  private readonly logger = new Logger(ToolsConfig.name);

  constructor(
    private readonly toolRegistry: ToolRegistry,
    private readonly webSearchTool: WebSearchTool,
  ) {}

  // Register all tools when module initializes
  onModuleInit() {
    this.logger.log('🔧 Registering tools...');

    try {
      // Register web search tool
      this.toolRegistry.register(this.webSearchTool);

      // Future tools will be registered here:
      // this.toolRegistry.register(this.calculatorTool);
      // this.toolRegistry.register(this.weatherTool);
      // this.toolRegistry.register(this.imageGenerationTool);
      // etc...

      const toolCount = this.toolRegistry.getCount();
      this.logger.log(`✅ Successfully registered ${toolCount} tool(s)`);
      
      // Log registered tool names
      const toolNames = this.toolRegistry.getToolNames();
      this.logger.log(`📋 Available tools: ${toolNames.join(', ')}`);
      
    } catch (error) {
      this.logger.error(`❌ Failed to register tools: ${error.message}`);
      throw error;
    }
  }
}