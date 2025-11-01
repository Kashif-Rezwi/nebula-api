import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { tavily } from '@tavily/core';

// Formatted search result for our application
export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  favicon: string;
  publishedDate?: string;
  relevanceScore: number;
}

// Service to interact with Tavily Search API (Official Implementation)
@Injectable()
export class TavilyService {
  private readonly logger = new Logger(TavilyService.name);
  private readonly client: ReturnType<typeof tavily>;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('TAVILY_API_KEY');
    
    if (!apiKey) {
      this.logger.warn('⚠️  TAVILY_API_KEY not found - web search will not work');
      // Don't throw - allow app to start, but search will fail gracefully
    } else {
      this.client = tavily({ apiKey });
      this.logger.log('✅ Tavily service initialized');
    }
  }

  // Check if Tavily is configured
  isConfigured(): boolean {
    return !!this.client;
  }

  // Search the web using Tavily (Official API)
  async search(
    query: string, 
    maxResults: number = 5
  ): Promise<WebSearchResult[]> {
    if (!this.isConfigured()) {
      throw new Error(
        'Tavily API is not configured. Please set TAVILY_API_KEY environment variable.'
      );
    }

    try {
      this.logger.log(`🔍 Searching: "${query}" (max: ${maxResults} results)`);

      // Official Tavily API call
      const response = await this.client.search(query, {
        searchDepth: 'basic', // 'basic' or 'advanced'
        topic: 'general', // 'general', 'news', or 'finance'
        maxResults,
        includeAnswer: false, // We let AI generate answer
        includeRawContent: false, // Just snippets for performance
        includeImages: false, // Can enable if needed
      });

      const results = this.formatResults(response.results || []);
      
      this.logger.log(`✅ Found ${results.length} results for "${query}"`);
      
      return results;
    } catch (error: any) {
      this.logger.error(`❌ Search failed for "${query}": ${error.message}`);
      throw new Error(`Web search failed: ${error.message}`);
    }
  }

  // Format Tavily API results into our structure
  private formatResults(results: any[]): WebSearchResult[] {
    return results.map((result) => ({
      title: result.title || 'Untitled',
      url: result.url || '',
      snippet: this.truncateSnippet(result.content || '', 200),
      favicon: this.getFaviconUrl(result.url || ''),
      publishedDate: result.published_date,
      relevanceScore: result.score || 0,
    }));
  }

  // Truncate snippet to max length
  private truncateSnippet(text: string, maxLength: number): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  }

  // Generate favicon URL from domain
  private getFaviconUrl(url: string): string {
    if (!url) return '';
    
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch {
      return '';
    }
  }

  // Search with auto-retry on failure
  async searchWithRetry(
    query: string, 
    maxResults: number = 5,
    maxRetries: number = 2
  ): Promise<WebSearchResult[]> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.search(query, maxResults);
      } catch (error: any) {
        lastError = error;
        this.logger.warn(`Attempt ${attempt}/${maxRetries} failed: ${error.message}`);
        
        if (attempt < maxRetries) {
          const delay = 1000 * attempt;
          this.logger.log(`Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    throw lastError!;
  }

  // Sleep helper for retry logic
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}