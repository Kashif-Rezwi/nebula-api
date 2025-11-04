import { Injectable, Logger } from '@nestjs/common';
import { ToolDefinition, ToolCollection } from './types';

@Injectable()
export class ToolManager {
  private readonly logger = new Logger(ToolManager.name);
  private readonly tools: ToolCollection = {};

  // Register a tool
  register(name: string, definition: ToolDefinition): void {
    // Check if already registered
    if (this.tools[name]) {
      throw new Error(`Tool '${name}' is already registered.`);
    }

    // Wrap execute with logging
    const originalExecute = definition.execute;
    this.tools[name] = {
      ...definition,
      execute: async (params: any) => {
        return this.executeWithLogging(name, originalExecute, params);
      },
    };

    this.logger.log(`âœ… Registered tool: ${name}`);
  }

// Get all tools
getTools(): Record<string, any> {
    const aiTools: Record<string, any> = {};
    
    Object.entries(this.tools).forEach(([name, tool]) => {
      aiTools[name] = {
        description: tool.description,
        inputSchema: tool.parameters,
        execute: tool.execute,
      };
    });
    
    return aiTools;
  }

  // Get count of registered tools
  count(): number {
    return Object.keys(this.tools).length;
  }

  // Execute tool with logging
  private async executeWithLogging(
    toolName: string,
    executeFn: (params: any) => Promise<any>,
    params: any,
  ): Promise<any> {
    const startTime = Date.now();

    this.logger.log(`ðŸ”§ Tool started: ${toolName}`);

    try {
      const result = await executeFn(params);
      const duration = Date.now() - startTime;

      this.logger.log(`âœ… Tool success: ${toolName} (${duration}ms)`);

      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;

      this.logger.error(`âŒ Tool failed: ${toolName} (${duration}ms) - ${error.message}`);

      throw new Error(`Tool '${toolName}' failed: ${error.message}`);
    }
  }
}