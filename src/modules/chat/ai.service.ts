import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { streamText, generateText, convertToModelMessages, type UIMessage } from 'ai';
import { groq } from '@ai-sdk/groq';

@Injectable()
export class AIService {
  constructor(private configService: ConfigService) {}

  private getModel() {
    return this.configService.get<string>('DEFAULT_AI_MODEL') || 'llama-3.1-8b-instant';
  }

  // Stream response with tool support
  streamResponse(
    messages: UIMessage[],
    tools?: Record<string, any>,
    maxSteps: number = 5
  ) {
    try {
      const modelMessages = convertToModelMessages(messages);
      
      const config: any = {
        model: groq(this.getModel()),
        messages: modelMessages,
        temperature: 0.7,
        maxTokens: 2000,
      };

      // Add tools if provided
      if (tools && Object.keys(tools).length > 0) {
        config.tools = tools;
        config.maxSteps = maxSteps; // Allow multi-step tool calls
      }

      return streamText(config);
    } catch (error: any) {
      throw new InternalServerErrorException(
        `AI streaming error: ${error.message}`,
        { cause: error }
      );
    }
  }

  // Generate non-streaming response (for title generation, etc.)
  async generateResponse(messages: UIMessage[]) {
    try {
      const modelMessages = convertToModelMessages(messages);
      
      const result = await generateText({
        model: groq(this.getModel()),
        messages: modelMessages,
        temperature: 0.7,
        maxOutputTokens: 2000,
      });
      
      return result.text;
    } catch (error: any) {
      throw new InternalServerErrorException(
        `AI generation error: ${error.message}`,
        { cause: error }
      );
    }
  }
}