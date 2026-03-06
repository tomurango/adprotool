'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const AI_PROVIDERS = [
  { value: 'gemini', label: 'Gemini (Google)' },
  { value: 'claude', label: 'Claude (Anthropic)' },
  { value: 'openai', label: 'OpenAI' },
] as const;


interface FormState {
  gemini_api_key: string;
  claude_api_key: string;
  openai_api_key: string;
  ai_provider: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    gemini_api_key: '',
    claude_api_key: '',
    openai_api_key: '',
    ai_provider: '',
  });
  const [savedMask, setSavedMask] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        setSavedMask(data);
        if (data.ai_provider) {
          setForm(prev => ({ ...prev, ai_provider: data.ai_provider }));
        }
      });
  }, []);

  function handleChange(key: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    // 空欄のAPIキーは送信しない（既存の値を消さないため）。プロバイダーは常に送信。
    const payload: Partial<FormState> = {};
    for (const [k, v] of Object.entries(form)) {
      if (k === 'ai_provider') {
        if (v) payload.ai_provider = v;
      } else if (v.trim()) {
        payload[k as keyof FormState] = v.trim();
      }
    }

    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    // 保存後、マスク表示を更新
    const updated = await fetch('/api/settings').then(r => r.json());
    setSavedMask(updated);
    setForm(prev => ({ gemini_api_key: '', claude_api_key: '', openai_api_key: '', ai_provider: prev.ai_provider }));
    setSaving(false);
    setSaved(true);
  }

  const keyFields: { key: keyof FormState; label: string; hint: string; billing: string }[] = [
    {
      key: 'gemini_api_key',
      label: 'Gemini API Key',
      hint: 'Google AI Studio から取得',
      billing: '無料枠あり。ただし Google Cloud の請求先情報（クレジットカード）の登録が必要です。',
    },
    {
      key: 'claude_api_key',
      label: 'Claude API Key',
      hint: 'Anthropic Console から取得',
      billing: 'Anthropic Console でクレジットを購入（プリペイド）してから利用できます。',
    },
    {
      key: 'openai_api_key',
      label: 'OpenAI API Key',
      hint: 'OpenAI Platform から取得',
      billing: 'OpenAI Platform でクレジットを追加（プリペイド）してから利用できます。',
    },
  ];

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => router.push('/')}
            className="text-gray-400 hover:text-gray-600 text-sm"
          >
            ← 戻る
          </button>
          <h1 className="text-xl font-bold text-gray-900">設定</h1>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* AIプロバイダー設定 */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-1">AIプロバイダー</h2>
            <p className="text-xs text-gray-400 mb-4">
              使用するAIを選択し、対応するAPIキーを入力してください。
            </p>

            {/* プロバイダー選択 */}
            <div className="flex gap-2 mb-6">
              {AI_PROVIDERS.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, ai_provider: p.value }))}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    form.ai_provider === p.value
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {keyFields.map(({ key, label, hint, billing }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                  </label>
                  {savedMask[key] && (
                    <p className="text-xs text-green-600 mb-1">
                      現在の値: {savedMask[key]}
                    </p>
                  )}
                  <input
                    type="password"
                    value={form[key]}
                    onChange={e => handleChange(key, e.target.value)}
                    placeholder={savedMask[key] ? '（変更する場合のみ入力）' : `${label}を入力`}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    autoComplete="off"
                  />
                  <p className="text-xs text-gray-400 mt-1">{hint}</p>
                  <p className="text-xs text-amber-600 mt-0.5">{billing}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 保存ボタン */}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? '保存中...' : '保存する'}
            </button>
            {saved && (
              <span className="text-sm text-green-600">保存しました</span>
            )}
          </div>
        </form>

        {/* 注意事項 */}
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-700">
          <p className="font-semibold mb-1">セキュリティについて</p>
          <p>
            APIキーはローカルのSQLiteデータベース（<code>db/koukokuul.sqlite</code>）に保存されます。
            このデータベースファイルはGitで管理されないため、他者と共有されることはありません。
          </p>
        </div>
      </div>
    </main>
  );
}
