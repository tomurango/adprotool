import type { AIMessage, ChatOptions } from '../types';
import type { ChecklistItem } from '@/types';
import type { EvaluatorResult } from './evaluator';

// 計画AI: 評価結果を受け取り、会話AIへの指示だけを作る。
// スコアリング・情報抽出は行わない。

const PLANNER_SYSTEM_PROMPT = `あなたはインタビュー進行の計画専門家です。
チェックシートのスコア状況を見て、次の会話ターンの方針を決めてください。
JSONのみで返してください。余計なテキストは一切含めないでください。`;

export interface PlannerResult {
  directive: {
    focusItemId: string; // 次に深掘りするチェック項目のid
    approach: string;    // アプローチ方法（一行）
    confirmations: {     // スコア2の項目：確認を取るべき推測（最大1件）
      itemId: string;
      question: string;  // チェック項目の質問文
      proposed: string;  // summary をもとにした推測回答
    }[];
  } | null;
}

export function buildPlannerMessages(
  checklistItems: ChecklistItem[],
  evaluatorResult: EvaluatorResult,
  recentMessages: AIMessage[]
): { messages: AIMessage[]; options: ChatOptions } {
  const scoredItems = checklistItems.map(item => {
    const eval_ = evaluatorResult.items.find(e => e.id === item.id);
    const score = item.isCompleted ? 3 : (eval_?.score ?? 0);
    const summary = eval_?.summary ?? null;
    return `- id="${item.id}" | スコア${score} | ${item.question}${summary ? `\n  概要: ${summary}` : ''}`;
  }).join('\n');

  const recent = recentMessages.slice(-6)
    .map(m => `${m.role === 'user' ? 'ユーザー' : 'AI'}: ${m.content}`)
    .join('\n\n');

  const prompt = `以下のスコア状況と直近の会話を見て、次の会話ターンの方針を決めてください。

【チェックシートのスコア状況】
スコア0: 未触 / スコア1: 情報不足 / スコア2: 概ね揃い（要確認） / スコア3: 完了
${scoredItems}

【直近の会話】
${recent}

【方針決定のルール】
- スコア2の項目がある場合: confirmations に最大1件追加し、ユーザーに確認を取る
- スコア0・1の項目がある場合: focusItemId でそのチェック項目のidを指定し、approach で深掘り方法を決める
- すべてスコア3なら: directive を null にする
- approach はシンプルに1行で。confirmations が多すぎるとしつこくなるので最大1件

【出力形式（JSONのみ）】
{
  "directive": {
    "focusItemId": "次に深掘りするチェック項目のid",
    "approach": "アプローチ方法（一行）",
    "confirmations": [
      { "itemId": "id", "question": "チェック項目の質問文", "proposed": "推測回答（一行）" }
    ]
  }
}

注意: confirmations は空配列でも可。すべて完了なら directive ごと null にする。文字列は改行なし一行で。`;

  return {
    messages: [{ role: 'user', content: prompt }],
    options: {
      systemPrompt: PLANNER_SYSTEM_PROMPT,
      temperature: 0.2,
      maxTokens: 1200,
    },
  };
}

export function parsePlannerResult(raw: string): PlannerResult | null {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const sanitized = match[0].replace(
      /"((?:[^"\\]|\\.)*)"/g,
      (_, content: string) => `"${content.replace(/[\r\n]+/g, ' ')}"`
    );
    const parsed = JSON.parse(sanitized);
    return parsed as PlannerResult;
  } catch {
    return null;
  }
}
