'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface StoreProfile {
  businessType: string;
  atmosphere: string;
  targetCustomer: string;
}

export default function GeneratePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<StoreProfile | null>(null);
  const [theme, setTheme] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('storeProfile');
    if (!saved) {
      router.replace('/');
      return;
    }
    setProfile(JSON.parse(saved));
  }, [router]);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !theme.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/instagram/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...profile, theme: theme.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? '生成に失敗しました');
        return;
      }

      sessionStorage.setItem('generatedResult', JSON.stringify(data));
      router.push('/result');
    } catch {
      setError('通信エラーが発生しました。もう一度お試しください。');
    } finally {
      setLoading(false);
    }
  }

  if (!profile) return null;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-10">

        {/* ヘッダー */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => router.push('/')}
            className="text-gray-400 hover:text-gray-600 text-sm"
          >
            ← 戻る
          </button>
          <h1 className="text-xl font-bold text-gray-900">投稿テーマを入力</h1>
        </div>

        {/* 店舗プロフィール確認 */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 mb-6 text-sm text-indigo-700 flex items-center justify-between">
          <span>{profile.businessType}・{profile.atmosphere}・{profile.targetCustomer}</span>
          <button
            onClick={() => router.push('/')}
            className="text-indigo-400 hover:text-indigo-600 text-xs ml-3 shrink-0"
          >
            変更
          </button>
        </div>

        {/* テーマ入力フォーム */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <form onSubmit={handleGenerate} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                今回の投稿テーマ
              </label>
              <textarea
                value={theme}
                onChange={e => setTheme(e.target.value)}
                rows={4}
                placeholder="例：新メニューのランチセットを紹介したい&#10;例：週末のタイムセールを告知したい&#10;例：スタッフの日常を見せたい"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">どんな投稿にしたいか、自由に書いてください。</p>
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!theme.trim() || loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'AIが生成中...' : 'キャプションを生成'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
