import { IsArray, IsString, IsOptional } from 'class-validator';

export class ChatRequestDto {
  @IsArray()
  messages: any[];
}