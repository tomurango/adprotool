import { NextResponse } from 'next/server';
import { initDb } from '@/lib/db/init';
import { getAllSettings, setSetting, type SettingKey } from '@/lib/user-settings';

export const dynamic = 'force-dynamic';

const ALLOWED_KEYS: SettingKey[] = [
  'gemini_api_key',
  'claude_api_key',
  'openai_api_key',
  'ai_provider',
];

export async function GET() {
  initDb();
  const settings = await getAllSettings();

  // APIキーはマスクして返す
  const masked: Record<string, string> = {};
  for (const [k, v] of Object.entries(settings)) {
    if (k.endsWith('_api_key') && v) {
      masked[k] = v.slice(0, 8) + '••••••••••••••••••••••••';
    } else {
      masked[k] = v;
    }
  }

  return NextResponse.json(masked);
}

export async function PUT(request: Request) {
  initDb();
  const body = await request.json();

  for (const [key, value] of Object.entries(body)) {
    if (!ALLOWED_KEYS.includes(key as SettingKey)) continue;
    if (typeof value !== 'string') continue;
    await setSetting(key as SettingKey, value);
  }

  return NextResponse.json({ success: true });
}
