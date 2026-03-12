export interface StoreProfile {
  businessType: string;
  atmosphere: string;
  targetCustomer: string;
}

export function buildInstagramCaptionPrompt(
  profile: StoreProfile,
  theme: string
): string {
  return `あなたはInstagramの投稿文（キャプション）とハッシュタグを作成する専門家です。

以下の店舗情報と投稿テーマをもとに、Instagramのフィード投稿用のキャプションとハッシュタグを作成してください。

【店舗情報】
- 業種：${profile.businessType}
- 雰囲気：${profile.atmosphere}
- ターゲット客層：${profile.targetCustomer}

【投稿テーマ】
${theme}

【出力形式】
以下のJSON形式のみで出力してください。説明文は不要です：
{
  "caption": "投稿キャプション本文",
  "hashtags": ["タグ1", "タグ2"]
}

【キャプションの条件】
- 店舗の雰囲気（${profile.atmosphere}）に合ったトーンで書く
- ${profile.targetCustomer}に響く言葉を選ぶ
- 絵文字を自然に使う
- 100〜200文字程度。短くテンポよく読みやすく
- 文の区切りで改行を入れる（1〜2文ごとに改行）
- 最後に来店・フォロー・いいねなどの自然な行動喚起を入れる

【ハッシュタグの条件】
- 20〜25個を作成
- 日本語タグと英語タグを混ぜる
- 業種関連・雰囲気関連・ターゲット関連をバランス良く
- "#" は含めず、タグ名のみ返す`;
}
