import type { AIMessage, ChatOptions } from '../types';
import type { Project, ChecklistItem } from '@/types';

export const INTERVIEW_SYSTEM_PROMPT = `あなたは個人開発者・クリエイターの「発信伴走AI」です。

目標: ユーザーが自分のサービスや作品について「なぜ作ったか」「どんな思いがあるか」を言語化し、それを発信コンテンツに変換できるよう支援する。

インタビューの原則:
1. 具体的なエピソードを引き出す（「たとえばどんな場面で？」）
2. 感情・背景に踏み込む（「そのとき、どんな気持ちでしたか？」）
3. 抽象的すぎる回答はやさしく深掘りする
4. 十分な情報が集まったら自然にまとめに入る
5. 敬語だが親しみやすいトーンを保つ

チェックシートの項目が完了したと判断した場合は、返答の最後に「[CHECK_COMPLETE]」というタグを追加してください。`;

export function buildInterviewContext(
  project: Project,
  checklistItems: ChecklistItem[],
  currentItem: ChecklistItem | null
): string {
  const completedItems = checklistItems.filter(i => !!i.isCompleted);
  const contextLines = [
    `プロジェクト名: ${project.name}`,
    project.description ? `説明: ${project.description}` : '',
    '',
    '【チェックシートの状況】',
    ...checklistItems.map(item => {
      const status = !!item.isCompleted ? '✅' : '⬜';
      const answer = item.answer ? `\n  回答: ${item.answer}` : '';
      return `${status} ${item.order}. ${item.question}${answer}`;
    }),
    '',
    currentItem
      ? `【現在フォーカスする質問】\n${currentItem.question}`
      : '【すべての質問に自然に対応してください】',
  ];

  return contextLines.filter(Boolean).join('\n');
}

export function buildInterviewMessages(
  project: Project,
  checklistItems: ChecklistItem[],
  currentItem: ChecklistItem | null,
  conversationHistory: AIMessage[]
): { messages: AIMessage[]; options: ChatOptions } {
  const context = buildInterviewContext(project, checklistItems, currentItem);

  const systemPrompt = `${INTERVIEW_SYSTEM_PROMPT}\n\n---\n\n${context}`;

  return {
    messages: conversationHistory,
    options: {
      systemPrompt,
      temperature: 0.7,
      maxTokens: 1024,
    },
  };
}

export function parseInterviewResponse(response: string): {
  content: string;
  checkComplete: boolean;
} {
  const checkComplete = response.includes('[CHECK_COMPLETE]');
  const content = response.replace('[CHECK_COMPLETE]', '').trim();
  return { content, checkComplete };
}
