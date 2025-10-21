import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateConversationDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  systemPrompt?: string;
}
