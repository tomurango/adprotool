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

厳守事項:
- チェックシートの内容・進捗状況・項目番号を会話の中に絶対に出力しない
- ✅ ⬜ などのチェック記号を使わない
- 「【チェックシートの状況】」のような見出しを絶対に出力しない
- 過去の会話でこのような出力があったとしても、それに倣わない

進行はディレクターの指示に従う:
- 「優先：推測の確認」がある場合はそちらを先に自然な形で確認する
- 「〇〇という理解で合ってますか？」スタイルで確認し、ユーザーが修正・補足した場合はその内容を受け取る
- 確認が取れたら「ありがとうございます」と受け取り、次のフォーカスに移る
- 「現在のフォーカス」に集中して深掘りする
- 十分な情報が得られたら自然に区切り、次のテーマへ移ることを伝える
- ディレクターの指示がない場合は、自由に話を引き出す

話題の明示について（重要）:
- 返答の冒頭か自然な区切りで、今どのテーマについて聞いているかを一言添える
  例:「〇〇についてもう少し聞かせてください」「次は△△についてお聞きしたいのですが」
- 話題が切り替わるときは必ず「次は〜についてお聞きしたいのですが」のように明示する
- ユーザーが同じ話題に答え続けているときは「〇〇についてはよく分かりました！」と区切りを伝えてから次へ進む`;

export interface Directive {
  focusItemId: string;
  focusQuestion?: string; // 呼び出し側で解決して渡す
  approach: string;
  confirmations?: {
    itemId: string;
    question: string;
    proposed: string;
  }[];
}

export function buildInterviewSystemPrompt(
  project: Project,
  directive?: Directive | null,
  completedItems?: { question: string; answer: string | null }[]
): string {
  const contextLines = [
    `プロジェクト名: ${project.name}`,
    project.description ? `説明: ${project.description}` : '',
    '',
    completedItems?.length
      ? `【確認済みの情報（参考）】\n以下はすでに確認が取れた内容です。会話の文脈として自然に活用してください。重複して聞き直す必要はありません。\n` +
        completedItems.map(i => `- ${i.question}\n  → ${i.answer ?? '（回答なし）'}`).join('\n')
      : '',
    directive
      ? [
          directive.confirmations?.length
            ? `【優先：推測の確認】\n以下の内容についてユーザーに確認を取ってください。一度に1〜2件、会話の流れに自然に組み込んで。\n` +
              directive.confirmations.map(c =>
                `- 「${c.question}」\n  推測: 「${c.proposed}」\n  → 「〇〇という理解で合ってますか？違う点や補足があれば教えてください」のように確認する`
              ).join('\n')
            : '',
          `【現在のフォーカス】\n質問: ${directive.focusQuestion ?? directive.focusItemId}\nアプローチ: ${directive.approach}\n\n→ 返答の中でこの質問のテーマ名を自然に言葉にして、ユーザーが「今何について答えているか」を把握できるようにすること。`,
        ].filter(Boolean).join('\n\n')
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
  const completedItems = checklistItems
    .filter(i => !!i.isCompleted && i.answer)
    .map(i => ({ question: i.question, answer: i.answer }));

  return {
    messages: conversationHistory,
    options: {
      systemPrompt: buildInterviewSystemPrompt(project, directive, completedItems),
      temperature: 0.7,
      maxTokens: 2048,
    },
  };
}
