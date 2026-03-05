import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIProvider, AIMessage, ChatOptions } from '../types';

export class GeminiProvider implements AIProvider {
  private client: GoogleGenerativeAI;
  private model: string;

  constructor(config: { model: string; apiKey: string }) {
    this.client = new GoogleGenerativeAI(config.apiKey);
    this.model = config.model;
  }

  async chat(messages: AIMessage[], options?: ChatOptions): Promise<string> {
    const model = this.client.getGenerativeModel({ model: this.model });

    const systemPrompt = options?.systemPrompt ?? messages.find(m => m.role === 'system')?.content;
    const chatMessages = messages.filter(m => m.role !== 'system');

    const history = chatMessages.slice(0, -1).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const lastMessage = chatMessages[chatMessages.length - 1];

    const chat = model.startChat({
      history,
      systemInstruction: systemPrompt,
      generationConfig: {
        temperature: options?.temperature,
        maxOutputTokens: options?.maxTokens,
      },
    });

    const result = await chat.sendMessage(lastMessage.content);
    return result.response.text();
  }

  async *stream(messages: AIMessage[], options?: ChatOptions): AsyncGenerator<string> {
    const model = this.client.getGenerativeModel({ model: this.model });

    const systemPrompt = options?.systemPrompt ?? messages.find(m => m.role === 'system')?.content;
    const chatMessages = messages.filter(m => m.role !== 'system');

    const history = chatMessages.slice(0, -1).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const lastMessage = chatMessages[chatMessages.length - 1];

    const chat = model.startChat({
      history,
      systemInstruction: systemPrompt,
      generationConfig: {
        temperature: options?.temperature,
        maxOutputTokens: options?.maxTokens,
      },
    });

    const result = await chat.sendMessageStream(lastMessage.content);
    for await (const chunk of result.stream) {
      yield chunk.text();
    }
  }
}
