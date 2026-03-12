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

  if (format === 'mootion_script') {
    return `あなたはMootion Storyteller向け動画スクリプトの専門家です。以下のインタビュー情報をもとに、約60秒の宣伝動画用スクリプトを作成してください。

【プロジェクト情報】
プロジェクト名: ${project.name}
${project.description ? `説明: ${project.description}` : ''}

【インタビュー回答】
${answersText || '（回答なし）'}

【Mootionの特徴】
- テキストプロンプトをそのまま日本語で入力できる
- スタイル（3D・アニメ・フォトリアル・コミックなど）を選べる
- シーンごとにキャラクター・背景・雰囲気・動きを指定できる

【出力形式】
---
■ 全体設定
スタイル: （3D / アニメ / フォトリアル / コミック / 水彩から推奨を1つ）
全体の雰囲気: （例: 温かみのある、スタイリッシュな、など）
主人公: （登場するキャラクターの簡単な説明）
---
■ シーン1（00:00〜00:12）
【映像】（Mootionに入力する日本語の映像描写。背景・キャラクターの動き・雰囲気を具体的に）
【ナレーション】（読み上げるテキスト）
【テロップ】（省略可）
---
■ シーン2（00:12〜00:30）
（同様）
---
■ シーン3（00:30〜00:48）
（同様）
---
■ シーン4（00:48〜01:00）
（同様）
---

【構成方針】
- シーン1: 共感・課題提示（見ている人が「これ自分のことだ」と感じる）
- シーン2: このサービス・作品との出会い・解決
- シーン3: 使ってみた変化・感情の動き
- シーン4: メッセージ＋CTA（一言で締める）
- 映像描写は視覚的に具体的に。「笑顔の人物が〇〇している」のように
${additionalInstruction ? `- ${additionalInstruction}` : ''}

スクリプトのみを出力してください（説明・前置きは不要です）。`;
  }

  if (format === 'runway_script_short') {
    return `あなたはRunway Gen-3向け動画広告スクリプトの専門家です。以下のインタビュー情報をもとに、Runway無料版向けの超短縮スクリプトを作成してください。

【プロジェクト情報】
プロジェクト名: ${project.name}
${project.description ? `説明: ${project.description}` : ''}

【インタビュー回答】
${answersText || '（回答なし）'}

【厳守事項】
- シーンは3つのみ
- 各フィールドの文字数上限を必ず守ること:
  - 映像プロンプト（英語）: 30語以内（約150文字）
  - カメラ: 15文字以内
  - ナレーション: 40文字以内

【出力形式（この形式のみ・余計な説明不要）】
---
■ シーン1（00:00〜00:10）
【映像プロンプト】（英語30語以内）
【カメラ】（15文字以内）
【ナレーション】（40文字以内）
---
■ シーン2（00:10〜00:20）
【映像プロンプト】（英語30語以内）
【カメラ】（15文字以内）
【ナレーション】（40文字以内）
---
■ シーン3（00:20〜00:30）
【映像プロンプト】（英語30語以内）
【カメラ】（15文字以内）
【ナレーション】（40文字以内）
---

【構成方針】
- シーン1: 課題・共感
- シーン2: サービスの核心
- シーン3: CTA（一言で締める）
${additionalInstruction ? `- ${additionalInstruction}` : ''}`;
  }

  if (format === 'runway_script') {
    return `あなたはRunway Gen-3向け動画広告スクリプトの専門家です。以下のインタビュー情報をもとに、約1分（60秒）の宣伝動画用スクリプトを作成してください。

【プロジェクト情報】
プロジェクト名: ${project.name}
${project.description ? `説明: ${project.description}` : ''}

【インタビュー回答】
${answersText || '（回答なし）'}

【出力形式】
シーンを6〜8個に分け、各シーンを以下の形式で記述してください：

---
■ シーン1（00:00〜00:08）
【映像プロンプト（英語）】Runway Gen-3に入力する映像生成プロンプト。被写体・背景・照明・雰囲気・カメラモーションを具体的に記述。
【カメラ】slow zoom in / static / pan left など
【ナレーション】このシーンで読み上げるテキスト（日本語）
【テロップ】画面に表示するキャッチコピーや強調文（省略可）
---

【制作方針】
- 合計60秒になるよう各シーンの尺を調整
- 映像プロンプトはRunwayが理解しやすい英語で、視覚的に具体的に
- カメラモーションはRunwayで使えるもの（slow zoom in/out, pan, dolly, static, orbit など）
- ナレーションは「なぜ作ったか」「どんな人に届けたいか」が自然に伝わる流れ
- 冒頭8秒で興味を引き、中盤で共感、末尾でCTAで締める構成
${additionalInstruction ? `- ${additionalInstruction}` : ''}

スクリプトのみを出力してください（説明・前置きは不要です）。`;
  }

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
