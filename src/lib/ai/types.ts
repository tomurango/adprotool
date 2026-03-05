export interface AIProvider {
  chat(messages: AIMessage[], options?: ChatOptions): Promise<string>;
  stream(messages: AIMessage[], options?: ChatOptions): AsyncGenerator<string>;
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}
