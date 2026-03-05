export interface SNSPlatform {
  post(content: string, options?: PostOptions): Promise<PostResult>;
  validateContent(content: string): ValidationResult;
  getCharacterLimit(): number;
}

export interface PostOptions {
  scheduledAt?: Date;
  mediaUrls?: string[];
}

export interface PostResult {
  success: boolean;
  postId?: string;
  url?: string;
  error?: string;
}

export interface ValidationResult {
  valid: boolean;
  characterCount: number;
  limit: number;
  error?: string;
}
