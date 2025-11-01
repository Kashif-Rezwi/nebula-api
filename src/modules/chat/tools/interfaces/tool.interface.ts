import { z } from 'zod';

// Base interface that all tools must implement, This ensures consistency across all tool implementations
export interface Tool<TParams = any, TResult = any> {
  name: string;
  description: string;
  parameters: z.ZodSchema<TParams>;
  execute(params: TParams): Promise<TResult>;
}

// Result of a tool execution, Includes both the result and metadata about the execution
export interface ToolExecutionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  toolName: string;
  executionId: string;
  duration: number;
  timestamp: Date;
}

// Tool call request from AI, This is what we receive when AI decides to call a tool
export interface ToolCallRequest {
  id: string;
  name: string;
  arguments: any;
}