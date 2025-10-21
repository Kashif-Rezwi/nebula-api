export class MessageResponseDto {
    id: string;
    role: string;
    content: string;
    createdAt: Date;
  
    constructor(partial: Partial<MessageResponseDto>) {
      Object.assign(this, partial);
    }
  }
  
  export class ConversationResponseDto {
    id: string;
    title: string;
    systemPrompt?: string;
    createdAt: Date;
    updatedAt: Date;
    messages?: MessageResponseDto[];
    lastMessage?: MessageResponseDto;
    
  
    constructor(partial: Partial<ConversationResponseDto>) {
      Object.assign(this, partial);
    }
  }