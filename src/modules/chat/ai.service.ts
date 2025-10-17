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

  // For streaming responses (existing method)
  streamResponse(messages: UIMessage[]) {
    try {
      const modelMessages = convertToModelMessages(messages);
      
      return streamText({
        model: groq(this.getModel()),
        messages: modelMessages,
        temperature: 0.7,
        maxOutputTokens: 2000,
      });
    } catch (error) {
      throw new InternalServerErrorException(
        `AI streaming error: ${error.message}`,
        { cause: error }
      );
    }
  }

  // For non-streaming responses (NEW!)
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
    } catch (error) {
      throw new InternalServerErrorException(
        `AI generation error: ${error.message}`,
        { cause: error }
      );
    }
  }
}