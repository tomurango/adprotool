import type { AIMessage, ChatOptions } from '../types';
import type { Project, ChecklistItem } from '@/types'; // ChecklistItem は buildInterviewMessages のシグネチャ維持のため残す

// 会話AIの役割: 自然な深掘り対話のみ。チェック完了の判断は行わない。
export const INTERVIEW_SYSTEM_PROMPT = `あなたは個人開発者・クリエイターの「発信伴走AI」です。

目標: ユーザーが自分のサービスや作品について「なぜ作ったか」「どんな思いがあるか」を言語化できるよう支援する。

インタビューの原則:
1. 具体的なエピソードを引き出す（「たとえばどんな場面で？」）
2. 感情・背景に踏み込む（「そのとき、どんな気持ちでしたか？」）
3. 抽象的すぎる回答はやさしく深掘りする
4. 敬語だが親しみやすいトーンを保つ
5. 自然な会話文のみを返す。リストや記号は使わない。

進行はディレクターの指示に従う:
- 「現在のフォーカス」に集中して深掘りする
- 十分な情報が得られたら自然に区切り、次のテーマへ移ることを伝える
- ディレクターの指示がない場合は、自由に話を引き出す`;

export interface Directive {
  focus: string;
  approach: string;
}

export function buildInterviewSystemPrompt(
  project: Project,
  directive?: Directive | null
): string {
  const contextLines = [
    `プロジェクト名: ${project.name}`,
    project.description ? `説明: ${project.description}` : '',
    '',
    directive
      ? `【現在のフォーカス】\nテーマ: ${directive.focus}\nアプローチ: ${directive.approach}`
      : '【自由に話を引き出してください】',
  ];

  return `${INTERVIEW_SYSTEM_PROMPT}\n\n---\n\n${contextLines.filter(Boolean).join('\n')}`;
}

export function buildInterviewMessages(
  project: Project,
  checklistItems: ChecklistItem[],
  currentItem: ChecklistItem | null,
  conversationHistory: AIMessage[],
  directive?: Directive | null
): { messages: AIMessage[]; options: ChatOptions } {
  return {
    messages: conversationHistory,
    options: {
      systemPrompt: buildInterviewSystemPrompt(project, directive),
      temperature: 0.7,
      maxTokens: 2048,
    },
  };
}
