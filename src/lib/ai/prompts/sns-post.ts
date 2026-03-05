import type { Project, ChecklistItem } from '@/types';

export function buildSNSPostPrompt(
  project: Project,
  checklistItems: ChecklistItem[],
  platform: 'twitter' | 'instagram',
  additionalInstruction?: string
): string {
  const completedItems = checklistItems.filter(i => !!i.isCompleted && i.answer);
  const characterLimit = platform === 'twitter' ? 140 : 2200;

  const answersText = completedItems
    .map(item => `【${item.question}】\n${item.answer}`)
    .join('\n\n');

  return `あなたはSNS投稿文の専門家です。以下のインタビュー情報をもとに、${platform === 'twitter' ? 'Twitter' : 'Instagram'}用の投稿文を作成してください。

【プロジェクト情報】
プロジェクト名: ${project.name}
${project.description ? `説明: ${project.description}` : ''}

【インタビュー回答】
${answersText || '（回答なし）'}

【作成条件】
- ${platform === 'twitter' ? 'Twitter' : 'Instagram'}向けの投稿文
- ${characterLimit}文字以内
- 個人開発者の等身大の言葉で、共感を呼ぶ内容
- 「なぜ作ったか」「どんな思いか」が伝わるよう
- ハッシュタグを3〜5個含める
${additionalInstruction ? `- ${additionalInstruction}` : ''}

投稿文のみを出力してください（説明は不要です）。`;
}
