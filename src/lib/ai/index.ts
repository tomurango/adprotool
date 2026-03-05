import { aiConfig } from '../../../ai.config';
import { GeminiProvider } from './providers/gemini';
import { ClaudeProvider } from './providers/claude';
import { OpenAIProvider } from './providers/openai';
import type { AIProvider } from './types';

function createAIProvider(): AIProvider {
  switch (aiConfig.defaultProvider) {
    case 'gemini': return new GeminiProvider(aiConfig.providers.gemini);
    case 'claude': return new ClaudeProvider(aiConfig.providers.claude);
    case 'openai': return new OpenAIProvider(aiConfig.providers.openai);
    default: return new GeminiProvider(aiConfig.providers.gemini);
  }
}

// 遅延初期化: リクエスト時まで実際のインスタンス化を遅らせる
let _ai: AIProvider | null = null;
export const ai: AIProvider = {
  chat: (...args) => {
    if (!_ai) _ai = createAIProvider();
    return _ai.chat(...args);
  },
  stream: (...args) => {
    if (!_ai) _ai = createAIProvider();
    return _ai.stream(...args);
  },
};

// アプリ内でのAI使用はすべてここ経由
export { buildInterviewMessages, parseInterviewResponse } from './prompts/interview';
export { buildSNSPostPrompt } from './prompts/sns-post';
export { buildVideoScriptPrompt } from './prompts/video-script';
export type { AIProvider, AIMessage, ChatOptions } from './types';
