import { IsString, MaxLength } from 'class-validator';

export class UpdateSystemPromptDto {
  @IsString()
  @MaxLength(2000)
  systemPrompt: string;
}