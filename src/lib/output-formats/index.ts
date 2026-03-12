export type OutputFormat = 'plain_script' | 'scene_based' | 'timeline' | 'runway_script' | 'runway_script_short' | 'mootion_script';

export interface OutputFormatMeta {
  format: OutputFormat;
  label: string;
  description: string;
}

export const OUTPUT_FORMAT_LIST: OutputFormatMeta[] = [
  {
    format: 'plain_script',
    label: '台本形式',
    description: '話し言葉で書かれたナレーション・セリフ',
  },
  {
    format: 'scene_based',
    label: 'シーン分け形式',
    description: 'シーン番号・映像描写・ナレーションを分けて記述',
  },
  {
    format: 'timeline',
    label: 'タイムライン形式',
    description: '時間軸（00:00〜）で構成を記述',
  },
  {
    format: 'runway_script',
    label: 'Runway用スクリプト',
    description: 'Runwayに貼り付けるシーン別映像プロンプト＋ナレーション（1分）',
  },
  {
    format: 'runway_script_short',
    label: 'Runway用（無料版・1000字以内）',
    description: '3シーン・1000文字以内に収めたRunway無料版向けスクリプト',
  },
  {
    format: 'mootion_script',
    label: 'Mootion用スクリプト',
    description: '日本語テキストをそのまま使えるMootion Storyteller向けスクリプト',
  },
];
