import { db } from './db';
import { userSettings } from './db/schema';
import { eq } from 'drizzle-orm';

export type SettingKey =
  | 'gemini_api_key'
  | 'claude_api_key'
  | 'openai_api_key'
  | 'ai_provider';

export async function getSetting(key: SettingKey): Promise<string | null> {
  const row = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.key, key));
  return row[0]?.value ?? null;
}

export async function setSetting(key: SettingKey, value: string): Promise<void> {
  await db
    .insert(userSettings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: userSettings.key,
      set: { value, updatedAt: new Date() },
    });
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await db.select().from(userSettings);
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
}

/**
 * AIプロバイダーのAPIキーをDBから取得し、なければenvにフォールバック。
 */
export async function resolveApiKey(provider: 'gemini' | 'claude' | 'openai'): Promise<string> {
  const dbKeyMap: Record<string, SettingKey> = {
    gemini: 'gemini_api_key',
    claude: 'claude_api_key',
    openai: 'openai_api_key',
  };
  const envKeyMap: Record<string, string> = {
    gemini: 'GEMINI_API_KEY',
    claude: 'CLAUDE_API_KEY',
    openai: 'OPENAI_API_KEY',
  };

  const fromDb = await getSetting(dbKeyMap[provider]);
  if (fromDb && fromDb.trim()) return fromDb.trim();

  const fromEnv = process.env[envKeyMap[provider]];
  if (fromEnv && fromEnv.trim()) return fromEnv.trim();

  throw new Error(
    `APIキーが設定されていません。設定ページで ${provider.toUpperCase()} のAPIキーを入力してください。`
  );
}
