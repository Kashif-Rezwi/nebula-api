export class UserResponseDto {
    id: string;
    email: string;
    credits: number;
    createdAt: Date;
  
    constructor(partial: Partial<UserResponseDto>) {
      Object.assign(this, partial);
    }
  }