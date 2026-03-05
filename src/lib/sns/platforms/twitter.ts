import { TwitterApi } from 'twitter-api-v2';
import type { SNSPlatform, PostOptions, PostResult, ValidationResult } from '../types';

const CHARACTER_LIMIT = 140;

export class TwitterPlatform implements SNSPlatform {
  private accessToken: string;
  private accessTokenSecret: string;

  constructor(accessToken: string, accessTokenSecret: string) {
    this.accessToken = accessToken;
    this.accessTokenSecret = accessTokenSecret;
  }

  async post(content: string, _options?: PostOptions): Promise<PostResult> {
    const validation = this.validateContent(content);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const apiKey = process.env.TWITTER_API_KEY;
    const apiSecret = process.env.TWITTER_API_SECRET;
    if (!apiKey || !apiSecret) {
      return { success: false, error: 'Twitter API credentials are not configured' };
    }

    const client = new TwitterApi({
      appKey: apiKey,
      appSecret: apiSecret,
      accessToken: this.accessToken,
      accessSecret: this.accessTokenSecret,
    });

    const tweet = await client.v2.tweet(content);
    return {
      success: true,
      postId: tweet.data.id,
      url: `https://twitter.com/i/web/status/${tweet.data.id}`,
    };
  }

  validateContent(content: string): ValidationResult {
    const count = content.length;
    return {
      valid: count <= CHARACTER_LIMIT,
      characterCount: count,
      limit: CHARACTER_LIMIT,
      error: count > CHARACTER_LIMIT ? `文字数が制限を超えています (${count}/${CHARACTER_LIMIT})` : undefined,
    };
  }

  getCharacterLimit(): number {
    return CHARACTER_LIMIT;
  }
}
