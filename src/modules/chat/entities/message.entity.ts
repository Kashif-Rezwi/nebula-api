import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
  } from 'typeorm';
  import { Conversation } from './conversation.entity';
  
  export enum MessageRole {
    USER = 'user',
    ASSISTANT = 'assistant',
    SYSTEM = 'system',
  }
  
  @Entity('messages')
  export class Message {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column()
    conversationId: string;
  
    @ManyToOne(() => Conversation, (conversation) => conversation.messages, {
      onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'conversationId' })
    conversation: Conversation;
  
    @Column({
      type: 'enum',
      enum: MessageRole,
    })
    role: MessageRole;
  
    @Column('text')
    content: string;
  
    @CreateDateColumn()
    createdAt: Date;
  }