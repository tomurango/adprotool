import type { Project, ChecklistItem } from '@/types';
import type { OutputFormat } from '@/lib/output-formats';

export function buildVideoScriptPrompt(
  project: Project,
  checklistItems: ChecklistItem[],
  format: OutputFormat,
  additionalInstruction?: string
): string {
  const completedItems = checklistItems.filter(i => !!i.isCompleted && i.answer);

  const answersText = completedItems
    .map(item => `【${item.question}】\n${item.answer}`)
    .join('\n\n');

  const formatInstruction = {
    plain_script: '台本形式（話し言葉で、ナレーション・セリフをそのまま記述）',
    scene_based: 'シーン分け形式（シーン番号・映像描写・ナレーションを分けて記述）',
    timeline: 'タイムライン形式（00:00〜00:30のように時間軸で構成を記述）',
  }[format];

  return `あなたは動画スクリプトの専門家です。以下のインタビュー情報をもとに、個人開発者・クリエイター向けの動画スクリプトを作成してください。

【プロジェクト情報】
プロジェクト名: ${project.name}
${project.description ? `説明: ${project.description}` : ''}

【インタビュー回答】
${answersText || '（回答なし）'}

【作成条件】
- 形式: ${formatInstruction}
- 長さ: 60〜90秒程度の動画を想定
- 「なぜ作ったか」「どんな思いか」が伝わる構成
- 視聴者が共感できる等身大の表現
${additionalInstruction ? `- ${additionalInstruction}` : ''}

スクリプトのみを出力してください（説明は不要です）。`;
}
