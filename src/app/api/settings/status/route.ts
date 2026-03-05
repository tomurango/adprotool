import { NextResponse } from 'next/server';
import { initDb } from '@/lib/db/init';
import { getSetting } from '@/lib/user-settings';
import { aiConfig } from '../../../../../ai.config';

export const dynamic = 'force-dynamic';

export async function GET() {
  initDb();

  const provider = aiConfig.defaultProvider;
  const keyMap = {
    gemini: 'gemini_api_key',
    claude: 'claude_api_key',
    openai: 'openai_api_key',
  } as const;

  const fromDb = await getSetting(keyMap[provider]);
  const fromEnv = process.env[
    { gemini: 'GEMINI_API_KEY', claude: 'CLAUDE_API_KEY', openai: 'OPENAI_API_KEY' }[provider]
  ];

  const configured = !!(fromDb?.trim() || fromEnv?.trim());

  return NextResponse.json({ configured, provider });
}
