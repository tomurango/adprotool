import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/lib/ai';
import { buildInstagramCaptionPrompt } from '@/lib/ai/prompts/instagram-caption';

export async function POST(req: NextRequest) {
  const { businessType, atmosphere, targetCustomer, theme } = await req.json();

  if (!businessType || !atmosphere || !targetCustomer || !theme) {
    return NextResponse.json({ error: '必要な情報が不足しています' }, { status: 400 });
  }

  const prompt = buildInstagramCaptionPrompt(
    { businessType, atmosphere, targetCustomer },
    theme
  );

  try {
    const response = await ai.chat([{ role: 'user', content: prompt }]);

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('JSON形式の応答が取得できませんでした');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      caption: parsed.caption as string,
      hashtags: parsed.hashtags as string[],
    });
  } catch {
    return NextResponse.json({ error: 'キャプションの生成に失敗しました' }, { status: 500 });
  }
}
