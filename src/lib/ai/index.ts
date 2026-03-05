import { aiConfig } from '../../../ai.config';
import { GeminiProvider } from './providers/gemini';
import { ClaudeProvider } from './providers/claude';
import { OpenAIProvider } from './providers/openai';
import { resolveApiKey } from '../user-settings';
import type { AIProvider, AIMessage, ChatOptions } from './types';

async function createAIProvider(): Promise<AIProvider> {
  // DBの設定を優先し、なければai.config.tsのデフォルトを使用
  const provider = aiConfig.defaultProvider;
  const apiKey = await resolveApiKey(provider);

  switch (provider) {
    case 'gemini':
      return new GeminiProvider({ ...aiConfig.providers.gemini, apiKey });
    case 'claude':
      return new ClaudeProvider({ ...aiConfig.providers.claude, apiKey });
    case 'openai':
      return new OpenAIProvider({ ...aiConfig.providers.openai, apiKey });
    default:
      return new GeminiProvider({ ...aiConfig.providers.gemini, apiKey });
  }
}

// リクエストごとにプロバイダーを生成（キーをDBから動的取得するため）
export const ai: AIProvider = {
  async chat(messages: AIMessage[], options?: ChatOptions): Promise<string> {
    const provider = await createAIProvider();
    return provider.chat(messages, options);
  },
  async *stream(messages: AIMessage[], options?: ChatOptions): AsyncGenerator<string> {
    const provider = await createAIProvider();
    yield* provider.stream(messages, options);
  },
};

// アプリ内でのAI使用はすべてここ経由
export { buildInterviewMessages, parseInterviewResponse } from './prompts/interview';
export { buildSNSPostPrompt } from './prompts/sns-post';
export { buildVideoScriptPrompt } from './prompts/video-script';
export type { AIProvider, AIMessage, ChatOptions } from './types';
