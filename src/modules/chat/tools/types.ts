import { z } from 'zod';

// Tool definition in AI SDK v5 format
export interface ToolDefinition<TParams = any, TResult = any> {
  name: string;
  description: string;
  parameters: z.ZodSchema<TParams>;
  execute(params: TParams): Promise<TResult>;
}

// Collection of tools
export type ToolCollection = Record<string, ToolDefinition>;

// Define result type
export interface WebSearchResult {
    query: string;
    results: Array<{
      title: string;
      url: string;
      snippet: string;
      relevanceScore: number;
    }>;
    summary: string;
    citations: Array<{
      text: string;
      sourceIndex: number;
      url: string;
    }>;
    searchedAt: string;
  }