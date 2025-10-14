import { IsArray, IsString, IsOptional } from 'class-validator';

export class ChatRequestDto {
  @IsArray()
  messages: any[];

  @IsOptional()
  @IsString()
  conversationId?: string;
}