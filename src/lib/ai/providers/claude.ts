import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider, AIMessage, ChatOptions } from '../types';

export class ClaudeProvider implements AIProvider {
  private client: Anthropic;
  private model: string;

  constructor(config: { model: string; apiKey: string }) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model;
  }

  async chat(messages: AIMessage[], options?: ChatOptions): Promise<string> {
    const systemPrompt = options?.systemPrompt ?? messages.find(m => m.role === 'system')?.content;
    const filteredMessages = messages.filter(m => m.role !== 'system');

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: options?.maxTokens ?? 2048,
      system: systemPrompt,
      messages: filteredMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      temperature: options?.temperature,
    });

    const content = response.content[0];
    if (content.type !== 'text') throw new Error('Unexpected response type');
    return content.text;
  }

  async *stream(messages: AIMessage[], options?: ChatOptions): AsyncGenerator<string> {
    const systemPrompt = options?.systemPrompt ?? messages.find(m => m.role === 'system')?.content;
    const filteredMessages = messages.filter(m => m.role !== 'system');

    const stream = await this.client.messages.stream({
      model: this.model,
      max_tokens: options?.maxTokens ?? 2048,
      system: systemPrompt,
      messages: filteredMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      temperature: options?.temperature,
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        yield chunk.delta.text;
      }
    }
  }
}
