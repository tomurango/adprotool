export type OutputFormat = 'plain_script' | 'scene_based' | 'timeline';

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
];
