import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { streamText, convertToModelMessages, type UIMessage } from 'ai';
import { groq } from '@ai-sdk/groq';

@Injectable()
export class AIService {
  constructor(private configService: ConfigService) {}

  // Stream AI response using AI SDK v5
  streamResponse(messages: UIMessage[]) {
    try {
      const model = 
        this.configService.get<string>('DEFAULT_AI_MODEL') || 
        'llama-3.1-8b-instant';
      
      // Convert UI messages to model messages
      const modelMessages = convertToModelMessages(messages);
      
      return streamText({
        model: groq(model),
        messages: modelMessages,
        temperature: 0.7,
        maxOutputTokens: 2000,
      });
    } catch (error) {
      throw new InternalServerErrorException(
        `AI service error: ${error.message}`,
        { cause: error }
      );
    }
  }
}