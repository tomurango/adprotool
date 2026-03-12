import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildInstagramCaptionPrompt } from '@/lib/ai/prompts/instagram-caption';

export async function POST(req: NextRequest) {
  const { businessType, atmosphere, targetCustomer, theme } = await req.json();

  if (!businessType || !atmosphere || !targetCustomer || !theme) {
    return NextResponse.json({ error: '必要な情報が不足しています' }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'APIキーが設定されていません' }, { status: 500 });
  }

  const prompt = buildInstagramCaptionPrompt(
    { businessType, atmosphere, targetCustomer },
    theme
  );

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('JSONが取得できませんでした');

    const parsed = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      caption: parsed.caption as string,
      hashtags: parsed.hashtags as string[],
    });
  } catch {
    return NextResponse.json({ error: 'キャプションの生成に失敗しました' }, { status: 500 });
  }
}
