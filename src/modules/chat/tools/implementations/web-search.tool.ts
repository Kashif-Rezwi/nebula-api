import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { ToolDefinition, WebSearchResult } from './../types';
import { TavilyService } from '../../tools/services/tavily.service';
import { SummaryService } from '../../tools/services/summary.service';

// Define parameters schema
const webSearchParams = z.object({
  query: z
    .string()
    .min(1)
    .max(500)
    .describe('Search query. Be specific and clear.'),
  maxResults: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional()
    .default(5)
    .describe('Maximum results to return (1-10, default: 5)'),
});

@Injectable()
export class WebSearchTool {
  private readonly logger = new Logger(WebSearchTool.name);

  constructor(
    private readonly tavilyService: TavilyService,
    private readonly summaryService: SummaryService,
  ) {}

  // Get tool definition
  getDefinition(): ToolDefinition<z.infer<typeof webSearchParams>, WebSearchResult> {
    return {
      name: 'web_search',

      description:
        'Search the web for current information, news, and real-time data. ' +
        'Use when you need up-to-date information beyond your training data. ' +
        'Returns relevant web pages with titles, URLs, and AI-generated summary.',

      parameters: webSearchParams,

      execute: async (params) => this.execute(params),
    };
  }

  // Execute web search
  private async execute(
    params: z.infer<typeof webSearchParams>,
  ): Promise<WebSearchResult> {
    const { query, maxResults = 5 } = params;

    this.logger.log(`ðŸŒ Searching: "${query}"`);

    try {
      // 1. Perform search
      const results = await this.tavilyService.searchWithRetry(
        query,
        maxResults,
        2,
      );

      // 2. Generate summary
      const { summary, citations } =
        await this.summaryService.generateSearchSummary(query, results);

      // 3. Return formatted result
      return {
        query,
        results: results.map((r) => ({
          title: r.title,
          url: r.url,
          snippet: r.snippet,
          relevanceScore: r.relevanceScore,
        })),
        summary,
        citations,
        searchedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      this.logger.error(`âŒ Search failed: ${error.message}`);
      throw new Error(`Web search for "${query}" failed: ${error.message}`);
    }
  }
}