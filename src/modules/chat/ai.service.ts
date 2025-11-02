import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  streamText,
  generateText,
  convertToModelMessages,
  type UIMessage,
} from 'ai';
import { groq } from '@ai-sdk/groq';

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private readonly modelName: string;
  private readonly toolModelName: string;
  private readonly textModelName: string;

  constructor(private configService: ConfigService) {
    this.modelName =
      this.configService.get<string>('DEFAULT_AI_MODEL') ||
      'openai/gpt-oss-120b';

    this.toolModelName =
      this.configService.get<string>('AI_TOOL_MODEL') ||
      'llama-3.3-70b-versatile';

    this.textModelName =
      this.configService.get<string>('AI_TEXT_MODEL') ||
      'llama-3.1-8b-instant';

    // Log the models that have been loaded
    this.logger.log(`🤖 AI Service Initialized`);
    this.logger.log(`  - Default Model: ${this.modelName} (from DEFAULT_AI_MODEL)`);
    this.logger.log(`  - Tool Model: ${this.toolModelName} (from AI_TOOL_MODEL)`);
    this.logger.log(`  - Text Model: ${this.textModelName} (from AI_TEXT_MODEL)`);
  }

  // Stream response with tool support
  streamResponse(
    messages: UIMessage[],
    tools?: Record<string, any>,
    maxSteps: number = 5,
  ) {
    try {
      const modelMessages = convertToModelMessages(messages);

      // Check if tools are provided
      const hasTools = tools && Object.keys(tools).length > 0;

      // If we have tools, use the tool-calling model, If not, use the fast text model.
      const modelToUse = hasTools ? this.toolModelName : this.textModelName;

      this.logger.log(`Streaming with model: ${modelToUse}`);

      const config: any = {
        model: groq(modelToUse),
        messages: modelMessages,
        temperature: 0.7,
        maxTokens: 2000,
      };

      // Add tools if provided
      if (hasTools) {
        config.tools = tools;
        config.maxSteps = maxSteps;
      }

      return streamText(config);
    } catch (error: any) {
      throw new InternalServerErrorException(
        `AI streaming error: ${error.message}`,
        { cause: error },
      );
    }
  }

  // Generate non-streaming response
  async generateResponse(messages: UIMessage[]) {
    try {
      const modelMessages = convertToModelMessages(messages);

      // Use the fast, cheap text model for non-streaming tasks
      this.logger.log(`Generating response with model: ${this.textModelName}`);

      const result = await generateText({
        model: groq(this.textModelName),
        messages: modelMessages,
        temperature: 0.7,
        maxOutputTokens: 2000,
      });

      return result.text;
    } catch (error: any) {
      throw new InternalServerErrorException(
        `AI generation error: ${error.message}`,
        { cause: error },
      );
    }
  }
}