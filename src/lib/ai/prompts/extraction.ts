import type { AIMessage, ChatOptions } from '../types';
import type { ChecklistItem } from '@/types';

// 抽出AIの役割: 会話履歴を読んでチェックシート回答をJSON抽出する。
// 会話の生成は行わない。

const EXTRACTION_SYSTEM_PROMPT = `あなたは会話分析の専門家です。
インタビューの会話履歴を読み、各質問への回答が十分に得られているか判定してください。
必ずJSON形式のみで回答してください。余計なテキストは一切含めないでください。`;

export interface ExtractionResult {
  items: {
    id: string;
    answered: boolean;
    summary: string | null;
  }[];
}

export function buildExtractionMessages(
  checklistItems: ChecklistItem[],
  conversationHistory: AIMessage[]
): { messages: AIMessage[]; options: ChatOptions } {
  const questions = checklistItems
    .map(item => `- id="${item.id}" | ${item.question}`)
    .join('\n');

  const conversation = conversationHistory
    .map(m => `${m.role === 'user' ? 'ユーザー' : 'AI'}: ${m.content}`)
    .join('\n\n');

  const prompt = `以下の会話履歴を分析し、各チェックシート質問への回答が十分に得られているか判定してください。

【チェックシートの質問】
${questions}

【会話履歴】
${conversation}

【判定基準】
- 質問の核心に触れた具体的な回答があれば answered: true
- 短い言及や曖昧な返答のみでは answered: false
- summary は日本語で2〜3文の要約（answered: false の場合は null）

【出力形式（このJSONのみを返すこと）】
{
  "items": [
    { "id": "質問のid属性の値", "answered": true, "summary": "回答の要約" },
    { "id": "質問のid属性の値", "answered": false, "summary": null }
  ]
}`;

  return {
    messages: [{ role: 'user', content: prompt }],
    options: {
      systemPrompt: EXTRACTION_SYSTEM_PROMPT,
      temperature: 0.1, // 低温度で安定したJSON出力
      maxTokens: 1024,
    },
  };
}

export function parseExtractionResult(raw: string): ExtractionResult | null {
  try {
    // コードブロックが含まれる場合は除去
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed.items)) return null;
    return parsed as ExtractionResult;
  } catch {
    return null;
  }
}
