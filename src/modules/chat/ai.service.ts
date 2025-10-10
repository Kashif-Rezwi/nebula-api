import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { streamText } from 'ai';
import { groq } from '@ai-sdk/groq';
import { ChatMessage } from '../../common/interfaces/chat-message.interface';

@Injectable()
export class AIService {
  constructor(private configService: ConfigService) {}

  streamResponse(messages: ChatMessage[]) {
    const model = this.configService.get<string>('DEFAULT_AI_MODEL') || 'llama-3.1-8b-instant';
    
    return streamText({
      model: groq(model),
      messages,
      temperature: 0.7,
      maxOutputTokens: 2000,
    });
  }
}
