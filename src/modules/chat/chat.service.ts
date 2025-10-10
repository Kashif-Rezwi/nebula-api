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
  import { ChatMessage } from '../../common/interfaces/chat-message.interface';
  
  @Injectable()
  export class ChatService {
    constructor(
      @InjectRepository(Conversation)
      private conversationRepository: Repository<Conversation>,
      @InjectRepository(Message)
      private messageRepository: Repository<Message>,
      private aiService: AIService,
    ) {}
  
    // Create new conversation
    async createConversation(
      userId: string,
      createConversationDto: CreateConversationDto,
    ): Promise<ConversationResponseDto> {
      const conversation = this.conversationRepository.create({
        userId,
        title: createConversationDto.title || 'New Chat',
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
  
    // Save message
    async saveMessage(
      conversationId: string,
      role: MessageRole,
      content: string,
    ): Promise<Message> {
      const message = this.messageRepository.create({
        conversationId,
        role,
        content,
      });
  
      return this.messageRepository.save(message);
    }
  
  // Get conversation messages for AI
  async getConversationMessages(conversationId: string): Promise<ChatMessage[]> {
    const messages = await this.messageRepository.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
    });

    return messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
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

  // Stream AI response using direct Vercel AI SDK
  async *streamChatResponse(
    conversationId: string,
    userId: string,
    userMessage: string,
  ) {
    // Verify ownership and save user message in single transaction
    const conversation = await this.verifyOwnership(conversationId, userId);
    await this.saveMessage(conversationId, MessageRole.USER, userMessage);

    // Get conversation history
    const messages = await this.getConversationMessages(conversationId);

    // Stream response using AIService
    const result = this.aiService.streamResponse(messages);
    let fullResponse = '';
    
    try {
      for await (const chunk of result.textStream) {
        fullResponse += chunk;
        yield { delta: chunk, isComplete: false };
      }

      // Save assistant response after streaming completes
      if (fullResponse) {
        await this.saveMessage(
          conversationId,
          MessageRole.ASSISTANT,
          fullResponse,
        );

        // Update conversation timestamp
        await this.conversationRepository.update(conversationId, {
          updatedAt: new Date(),
        });
      }

      yield { delta: '', isComplete: true };
    } catch (error) {
      throw new InternalServerErrorException(
        `Chat streaming failed: ${error.message}`,
        { cause: error }
      );
    }
  }
  }