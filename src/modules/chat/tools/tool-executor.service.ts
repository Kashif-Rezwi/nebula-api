import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ToolRegistry } from './tool.registry';
import {
  ToolExecutionResult,
  ToolCallRequest,
} from './interfaces/tool.interface';
import { v4 as uuidv4 } from 'uuid';

// Service responsible for safely executing tools, Handles validation, error handling, timeouts, and logging
@Injectable()
export class ToolExecutorService {
  private readonly logger = new Logger(ToolExecutorService.name);

  constructor(private readonly toolRegistry: ToolRegistry) {}

  // Execute a tool call with full error handling and validation
  async executeToolCall(
    toolCall: ToolCallRequest,
  ): Promise<ToolExecutionResult> {
    const executionId = uuidv4();
    const startTime = Date.now();

    this.logger.log(
      `🔧 Executing tool: ${toolCall.name} (ID: ${executionId})`
    );
    this.logger.debug(`Parameters: ${JSON.stringify(toolCall.arguments)}`);

    try {
      // 1. Validate tool exists
      const tool = this.toolRegistry.get(toolCall.name);
      if (!tool) {
        throw new NotFoundException(
          `Tool '${toolCall.name}' not found. ` +
          `Available tools: ${this.toolRegistry.getToolNames().join(', ')}`
        );
      }

      // 2. Validate parameters against schema
      let validatedParams;
      try {
        validatedParams = tool.parameters.parse(toolCall.arguments);
      } catch (error) {
        throw new BadRequestException(
          `Invalid parameters for tool '${toolCall.name}': ${error.message}`
        );
      }

      // 3. Execute tool with timeout protection
      const result = await this.executeWithTimeout(
        () => tool.execute(validatedParams),
        30000, // 30 second timeout
        toolCall.name
      );

      // 4. Calculate duration
      const duration = Date.now() - startTime;

      this.logger.log(
        `✅ Tool '${toolCall.name}' executed successfully in ${duration}ms`
      );

      // 5. Return success result
      return {
        success: true,
        data: result,
        toolName: toolCall.name,
        executionId,
        duration,
        timestamp: new Date(),
      };

    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error(
        `❌ Tool '${toolCall.name}' failed after ${duration}ms: ${error.message}`,
        error.stack
      );

      // Return error result (don't throw - we want to continue conversation)
      return {
        success: false,
        error: error.message || 'Tool execution failed',
        toolName: toolCall.name,
        executionId,
        duration,
        timestamp: new Date(),
      };
    }
  }

  // Execute multiple tools in parallel
  async executeToolCalls(
    toolCalls: ToolCallRequest[],
  ): Promise<ToolExecutionResult[]> {
    this.logger.log(`🔧 Executing ${toolCalls.length} tools in parallel`);

    // Execute all tools concurrently
    const results = await Promise.all(
      toolCalls.map((toolCall) => this.executeToolCall(toolCall))
    );

    const successCount = results.filter((r) => r.success).length;
    this.logger.log(
      `✅ Completed ${successCount}/${toolCalls.length} tools successfully`
    );

    return results;
  }

  // Execute a function with timeout protection
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number,
    toolName: string,
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Tool '${toolName}' timed out after ${timeoutMs}ms`)),
          timeoutMs
        )
      ),
    ]);
  }

  // Format tool execution result for AI consumption
  formatResultForAI(result: ToolExecutionResult): string {
    if (result.success) {
      return JSON.stringify(result.data, null, 2);
    } else {
      return `Error executing ${result.toolName}: ${result.error}`;
    }
  }

  // Get execution statistics (useful for monitoring)
  getStats() {
    return {
      availableTools: this.toolRegistry.getCount(),
      toolNames: this.toolRegistry.getToolNames(),
    };
  }
}