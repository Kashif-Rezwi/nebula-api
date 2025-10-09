export class AuthResponseDto {
    accessToken: string;
    user: {
      id: string;
      email: string;
      credits: number;
    };
  
    constructor(partial: Partial<AuthResponseDto>) {
      Object.assign(this, partial);
    }
  }