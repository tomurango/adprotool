import type { AIMessage, ChatOptions } from '../types';
import type { ChecklistItem } from '@/types';

// ディレクターAIの役割:
// 1. 会話履歴から回答を抽出してチェックシートを更新
// 2. 次の会話ターンで何をどう深掘りするか指示を出す

const DIRECTOR_SYSTEM_PROMPT = `あなたは会話インタビューのディレクターです。
会話履歴を分析し、回答の抽出と次ターンへの指示を同時に行ってください。
必ずJSON形式のみで回答してください。余計なテキストは一切含めないでください。`;

export interface DirectorResult {
  extracted: {
    id: string;
    answered: boolean;   // true = 十分な情報が揃った（DBに保存）
    gathered: string | null; // 会話から読み取れた内容（部分的でも記録）
    missing: string | null;  // まだ足りていない情報（answered: true なら null）
  }[];
  directive: {
    focus: string;
    approach: string;
  } | null;
}

export interface ExtractionResult {
  items: DirectorResult['extracted'];
}

export function buildDirectorMessages(
  checklistItems: ChecklistItem[],
  conversationHistory: AIMessage[]
): { messages: AIMessage[]; options: ChatOptions } {
  const questions = checklistItems
    .map(item => `- id="${item.id}" | ${!!item.isCompleted ? '✅回答済み' : '⬜未回答'} | ${item.question}`)
    .join('\n');

  const unansweredItems = checklistItems.filter(i => !i.isCompleted);

  const conversation = conversationHistory
    .map(m => `${m.role === 'user' ? 'ユーザー' : 'AI'}: ${m.content}`)
    .join('\n\n');

  const directiveInstruction = unansweredItems.length > 0
    ? `残り${unansweredItems.length}項目が未回答です。次の会話ターンで会話AIに与える指示を考えてください。
- focus: 次に深掘りすべき質問テーマ（具体的に）
- approach: どんな角度・質問スタイルで聞くか（例: 「感情面から」「失敗談として」「数字で具体化して」）`
    : 'すべて回答済みのため directive は null にしてください。';

  const prompt = `以下の会話履歴を分析してください。

【チェックシートの質問】
${questions}

【会話履歴】
${conversation}

【タスク1: 回答分析（⬜未回答の項目のみ対象）】
各項目について以下を判定してください:

answered の判定基準（厳格に）:
- 質問の核心について、具体的なエピソード・事実・気持ちが十分に語られていれば true
- 触れてはいるが浅い・曖昧・一言程度の場合は false
- 完全に話題に触れていない場合も false

gathered（必ず記入）:
- 会話から読み取れた内容を簡潔に書く（answered が false でも書く）
- 会話でまだ触れていない場合は null

missing（answered: false の場合のみ記入）:
- 質問に答えるためにまだ足りていない情報・エピソード・視点を具体的に書く
- answered: true の場合は null

【タスク2: 次ターンへの指示】
${directiveInstruction}

【出力形式（このJSONのみを返すこと）】
{
  "extracted": [
    { "id": "質問のid", "answered": true, "gathered": "読み取れた内容（一行）", "missing": null },
    { "id": "質問のid", "answered": false, "gathered": "部分的に読み取れた内容（一行）", "missing": "まだ足りていない情報（一行）" },
    { "id": "質問のid", "answered": false, "gathered": null, "missing": "まだ何も触れていないため全般的な情報が必要" }
  ],
  "directive": {
    "focus": "次に深掘りすべきテーマ（一行）",
    "approach": "具体的なアプローチ方法（一行）"
  }
}

注意: すべての文字列値は改行を含まない一行テキストにすること。`;

  return {
    messages: [{ role: 'user', content: prompt }],
    options: {
      systemPrompt: DIRECTOR_SYSTEM_PROMPT,
      temperature: 0.1,
      maxTokens: 3000,
    },
  };
}

export function parseDirectorResult(raw: string): DirectorResult | null {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;

    // JSON文字列値内のリテラル改行をスペースに置換（AIがよく入れる）
    const sanitized = match[0].replace(
      /"((?:[^"\\]|\\.)*)"/g,
      (_, content: string) => `"${content.replace(/[\r\n]+/g, ' ')}"`
    );

    const parsed = JSON.parse(sanitized);
    if (!Array.isArray(parsed.extracted)) return null;
    return parsed as DirectorResult;
  } catch {
    return null;
  }
}

// 後方互換エイリアス
export function buildExtractionMessages(
  checklistItems: ChecklistItem[],
  conversationHistory: AIMessage[]
) {
  return buildDirectorMessages(checklistItems, conversationHistory);
}

export function parseExtractionResult(raw: string): ExtractionResult | null {
  const result = parseDirectorResult(raw);
  if (!result) return null;
  return { items: result.extracted };
}

