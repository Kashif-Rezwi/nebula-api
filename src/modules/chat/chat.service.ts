import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { Message, MessageRole } from './entities/message.entity';
import { CreateConversationDto } from './dto/create-conversation.dto';
import {
  ConversationResponseDto,
  MessageResponseDto,
} from './dto/conversation-response.dto';
import { AIService } from './ai.service';
import { UIMessage } from 'ai';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    private aiService: AIService,
  ) { }

  // Convert database messages to UIMessage format for AI SDK
  private async getUIMessages(conversationId: string): Promise<UIMessage[]> {
    const messages = await this.messageRepository.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
    });

    return messages.map((msg) => ({
      id: msg.id,
      role: msg.role as 'user' | 'assistant' | 'system',
      parts: [{ type: 'text', text: msg.content }],
    }));
  }

  // Extract text content from UIMessage parts
  private extractTextFromUIMessage(message: UIMessage): string {
    return message.parts
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join('');
  }

  // Save UIMessage to database
  private async saveUIMessage(
    conversationId: string,
    message: UIMessage,
  ): Promise<Message> {
    const content = this.extractTextFromUIMessage(message);

    const dbMessage = this.messageRepository.create({
      conversationId,
      role: message.role as MessageRole,
      content,
    });

    return this.messageRepository.save(dbMessage);
  }


  // Save the assistant's response after streaming completes
  async saveAssistantResponse(
    conversationId: string,
    responseMessage: UIMessage,
  ): Promise<void> {
    await this.saveUIMessage(conversationId, responseMessage);

    // Update conversation timestamp
    await this.conversationRepository.update(conversationId, {
      updatedAt: new Date(),
    });
  }

  // Complete streaming flow with proper error handling and transaction safety
  async handleStreamingResponse(
    conversationId: string,
    userId: string,
    messages: UIMessage[],
  ) {
    try {
      // Verify ownership first
      await this.verifyOwnership(conversationId, userId);

      // Get the last user message (only process the latest)
      const lastUserMessage = messages[messages.length - 1];
      if (!lastUserMessage) {
        throw new InternalServerErrorException('No user message provided');
      }

      // Get conversation history
      const historyMessages = await this.getUIMessages(conversationId);
      const allMessages = [...historyMessages, lastUserMessage];

      // Save user message first
      await this.saveUIMessage(conversationId, lastUserMessage);

      // Get StreamText result
      const result = this.aiService.streamResponse(allMessages);

      // Return the AI SDK v5 Response object with onFinish callback
      return result.toUIMessageStreamResponse({
        originalMessages: messages,
        generateMessageId: () => this.generateMessageId(),

        // Save the assistant's response after streaming completes
        onFinish: async ({ responseMessage }) => {
          await this.saveAssistantResponse(conversationId, responseMessage);
        },
      });
    } catch (error) {
      throw new InternalServerErrorException(
        `Chat streaming failed: ${error.message}`,
        { cause: error }
      );
    }
  }

  // Generate unique message ID
  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Create new conversation
  async createConversation(
    userId: string,
    createConversationDto: CreateConversationDto,
  ): Promise<ConversationResponseDto> {
    const conversation = this.conversationRepository.create({
      userId,
      title: createConversationDto.title || 'Untitled',
    });

    const saved = await this.conversationRepository.save(conversation);

    return new ConversationResponseDto({
      id: saved.id,
      title: saved.title,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    });
  }

  // Get all conversations for a user
  async getUserConversations(
    userId: string,
  ): Promise<ConversationResponseDto[]> {
    const conversations = await this.conversationRepository.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
      relations: ['messages'],
    });

    return conversations.map((conv) => {
      const lastMessage =
        conv.messages.length > 0
          ? conv.messages[conv.messages.length - 1]
          : null;

      return new ConversationResponseDto({
        id: conv.id,
        title: conv.title,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        lastMessage: lastMessage
          ? new MessageResponseDto({
            id: lastMessage.id,
            role: lastMessage.role,
            content: lastMessage.content.substring(0, 100),
            createdAt: lastMessage.createdAt,
          })
          : undefined,
      });
    });
  }

  // Get single conversation with all messages
  async getConversation(
    conversationId: string,
    userId: string,
  ): Promise<ConversationResponseDto> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['messages'],
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return new ConversationResponseDto({
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      messages: conversation.messages.map(
        (msg) =>
          new MessageResponseDto({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            createdAt: msg.createdAt,
          }),
      ),
    });
  }

  // Delete conversation
  async deleteConversation(
    conversationId: string,
    userId: string,
  ): Promise<void> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    await this.conversationRepository.remove(conversation);
  }

  // Verify conversation ownership
  private async verifyOwnership(conversationId: string, userId: string): Promise<Conversation> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return conversation;
  }

  // Generate title for a conversation
  async generateTitle(
    conversationId: string,
    userId: string,
    userMessage: string,
  ): Promise<string> {
    // Verify ownership
    await this.verifyOwnership(conversationId, userId);

    // Generate title using AI
    const messages: UIMessage[] = [
      {
        id: 'system',
        role: 'system',
        parts: [{
          type: 'text',
          text: 'Generate a short, concise title (max 6 words) for a conversation that starts with the following user message. Return ONLY the title, nothing else.'
        }]
      },
      {
        id: 'user',
        role: 'user',
        parts: [{
          type: 'text',
          text: userMessage
        }]
      }
    ];

    const title = await this.aiService.generateResponse(messages);
    const cleanTitle = title.trim().replace(/^["']|["']$/g, '');

    // Update conversation with the title
    await this.conversationRepository.update(conversationId, {
      title: cleanTitle,
    });

    return cleanTitle;
  }

}