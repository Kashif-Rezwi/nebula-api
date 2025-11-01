import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Tool } from './interfaces/tool.interface';
import z4 from 'zod/v4';

// Central registry for all available tools, Acts as a service locator pattern for tools
@Injectable()
export class ToolRegistry implements OnModuleInit {
  private readonly logger = new Logger(ToolRegistry.name);
  private readonly tools = new Map<string, Tool>();

  // Lifecycle hook - runs when module initializes, Good place to log registered tools
  onModuleInit() {
    this.logger.log(`Tool Registry initialized with ${this.tools.size} tools`);
    
    if (this.tools.size > 0) {
      this.logger.log('Available tools:');
      this.tools.forEach((tool) => {
        this.logger.log(`  - ${tool.name}: ${tool.description}`);
      });
    } else {
      this.logger.warn('No tools registered yet!');
    }
  }

  // Register a new tool
  register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(
        `Tool with name '${tool.name}' is already registered. ` +
        `Tool names must be unique.`
      );
    }

    // Validate tool structure
    this.validateTool(tool);

    this.tools.set(tool.name, tool);
    this.logger.log(`✅ Registered tool: ${tool.name}`);
  }

  // Get a tool by name
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  // Get all registered tools
  getAll(): Tool[] {
    return Array.from(this.tools.values());
  }

  // Check if a tool exists
  has(name: string): boolean {
    return this.tools.has(name);
  }

  // Get tool names as array
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  // Get tool count
  getCount(): number {
    return this.tools.size;
  }

  // Convert tools to AI SDK format, This generates the tools object that AI SDK expects
  toAISDKFormat(): Record<string, any> {
    const aiTools: Record<string, any> = {};

    this.tools.forEach((tool) => {
      aiTools[tool.name] = {
        description: tool.description,
        parameters: z4.toJSONSchema(tool.parameters, { target: 'openapi-3.0' }),
        execute: tool.execute.bind(tool), // Bind context
      };
    });

    return aiTools;
  }

  // Validate tool structure before registration, Ensures tool follows the contract
  private validateTool(tool: Tool): void {
    if (!tool.name) {
      throw new Error('Tool must have a name');
    }

    if (typeof tool.name !== 'string') {
      throw new Error('Tool name must be a string');
    }

    // Validate name format (lowercase, underscores only)
    if (!/^[a-z_]+$/.test(tool.name)) {
      throw new Error(
        `Tool name '${tool.name}' is invalid. ` +
        `Use lowercase letters and underscores only (e.g., 'web_search')`
      );
    }

    if (!tool.description) {
      throw new Error(`Tool '${tool.name}' must have a description`);
    }

    if (!tool.parameters) {
      throw new Error(`Tool '${tool.name}' must have parameters schema`);
    }

    if (typeof tool.execute !== 'function') {
      throw new Error(`Tool '${tool.name}' must have an execute method`);
    }
  }

  // Clear all tools (useful for testing)
  clear(): void {
    this.tools.clear();
    this.logger.warn('All tools cleared from registry');
  }
}