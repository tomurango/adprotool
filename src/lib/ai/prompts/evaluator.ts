import type { AIMessage, ChatOptions } from '../types';
import type { ChecklistItem } from '@/types';

// 評価AI: 各チェック項目を 0〜3 でスコアリングするだけ。
// 指示生成・方針決定は行わない。

const EVALUATOR_SYSTEM_PROMPT = `あなたはチェックシート評価の専門家です。
会話履歴を読み、各質問への回答状況を0〜3でスコアリングしてください。
JSONのみで返してください。余計なテキストは一切含めないでください。`;

export interface EvaluatorResult {
  items: {
    id: string;
    score: 0 | 1 | 2 | 3;
    summary: string | null;     // score 1以上の場合のみ。会話から読み取れた内容（一行）
    missing: string | null;     // score 0〜2の場合のみ。まだ足りていない情報（一行）
    shouldUpdate?: boolean;     // 完了済み項目: 新情報で上書きすべきか
    reasoning?: string | null;  // shouldUpdate=true の場合: 上書き根拠（一行）
  }[];
}

export function buildEvaluatorMessages(
  checklistItems: ChecklistItem[],
  conversationHistory: AIMessage[]
): { messages: AIMessage[]; options: ChatOptions } {
  const incomplete = checklistItems.filter(i => !i.isCompleted);
  const completed = checklistItems.filter(i => !!i.isCompleted && i.answer);

  const incompleteSection = incomplete.length
    ? `【未回答のチェック項目】\n` + incomplete.map(i => `- id="${i.id}" | ${i.question}`).join('\n')
    : '';

  const completedSection = completed.length
    ? `【回答済みのチェック項目（更新確認）】\n以下はすでに回答済みです。会話の中でより詳しい情報・修正・補足が出てきた場合のみ shouldUpdate: true にしてください。\n` +
      completed.map(i => `- id="${i.id}" | ${i.question}\n  現在の回答: 「${i.answer}」`).join('\n')
    : '';

  const conversation = conversationHistory
    .map(m => `${m.role === 'user' ? 'ユーザー' : 'AI'}: ${m.content}`)
    .join('\n\n');

  const prompt = `以下の会話履歴を読み、各チェック項目を評価してください。

【スコア基準（未回答項目のみ）】
0: まだ会話で全く触れていない
1: 少し触れたが情報が不十分・曖昧
2: 概ね情報が揃っている（ユーザーに確認が取れれば完了できる）
3: 十分な情報があり、ユーザーが確認・同意済み（完了とみなせる）

${incompleteSection}

${completedSection}

【会話履歴】
${conversation}

【出力形式（JSONのみ）】
{
  "items": [
    { "id": "未回答項目のid", "score": 3, "summary": "確認済みの内容（一行）", "missing": null },
    { "id": "未回答項目のid", "score": 2, "summary": "概ね読み取れた内容（一行）", "missing": "確認が取れていない点（一行）" },
    { "id": "未回答項目のid", "score": 1, "summary": "部分的に読み取れた内容（一行）", "missing": "まだ足りていない具体的な情報（一行）" },
    { "id": "未回答項目のid", "score": 0, "summary": null, "missing": "この質問で本来聞きたいこと（一行）" },
    { "id": "回答済み項目のid", "score": 3, "summary": "更新後の内容（一行）", "missing": null, "shouldUpdate": true, "reasoning": "ユーザーが補足・修正した根拠（一行）" },
    { "id": "回答済み項目のid", "score": 3, "summary": null, "missing": null, "shouldUpdate": false, "reasoning": null }
  ]
}

注意: すべての文字列は改行を含まない一行テキスト。missing はスコア0〜2の未回答項目にのみ記入（スコア3はnull）。shouldUpdate は回答済み項目にのみ付与。`;

  return {
    messages: [{ role: 'user', content: prompt }],
    options: {
      systemPrompt: EVALUATOR_SYSTEM_PROMPT,
      temperature: 0.1,
      maxTokens: 2000,
    },
  };
}

export function parseEvaluatorResult(raw: string): EvaluatorResult | null {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const sanitized = match[0].replace(
      /"((?:[^"\\]|\\.)*)"/g,
      (_, content: string) => `"${content.replace(/[\r\n]+/g, ' ')}"`
    );
    const parsed = JSON.parse(sanitized);
    if (!Array.isArray(parsed.items)) return null;
    return parsed as EvaluatorResult;
  } catch {
    return null;
  }
}
