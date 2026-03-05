import { snsConfig } from '../../../sns.config';
import { TwitterPlatform } from './platforms/twitter';
import type { SNSPlatform } from './types';

export function createSNSPlatform(
  platform: 'twitter' | 'instagram',
  credentials: { accessToken: string; accessTokenSecret: string }
): SNSPlatform {
  switch (platform) {
    case 'twitter':
      return new TwitterPlatform(credentials.accessToken, credentials.accessTokenSecret);
    default:
      throw new Error(`Platform "${platform}" is not yet supported`);
  }
}

export type { SNSPlatform, PostOptions, PostResult, ValidationResult } from './types';
