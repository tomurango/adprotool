'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Result {
  caption: string;
  hashtags: string[];
}

export default function ResultPage() {
  const router = useRouter();
  const [result, setResult] = useState<Result | null>(null);
  const [captionCopied, setCaptionCopied] = useState(false);
  const [hashtagsCopied, setHashtagsCopied] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem('generatedResult');
    if (!saved) {
      router.replace('/generate');
      return;
    }
    setResult(JSON.parse(saved));
  }, [router]);

  function copyToClipboard(text: string, type: 'caption' | 'hashtags') {
    navigator.clipboard.writeText(text);
    if (type === 'caption') {
      setCaptionCopied(true);
      setTimeout(() => setCaptionCopied(false), 2000);
    } else {
      setHashtagsCopied(true);
      setTimeout(() => setHashtagsCopied(false), 2000);
    }
  }

  if (!result) return null;

  const hashtagsText = result.hashtags.map(t => `#${t}`).join(' ');

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-10">

        {/* ヘッダー */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => router.push('/generate')}
            className="text-gray-400 hover:text-gray-600 text-sm"
          >
            ← 戻る
          </button>
          <h1 className="text-xl font-bold text-gray-900">生成結果</h1>
        </div>

        <div className="space-y-4">

          {/* キャプション */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">キャプション</h2>
              <button
                onClick={() => copyToClipboard(result.caption, 'caption')}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-3 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
              >
                {captionCopied ? 'コピーしました！' : 'コピー'}
              </button>
            </div>
            <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
              {result.caption}
            </p>
          </div>

          {/* ハッシュタグ */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">
                ハッシュタグ
                <span className="text-xs text-gray-400 font-normal ml-2">{result.hashtags.length}個</span>
              </h2>
              <button
                onClick={() => copyToClipboard(hashtagsText, 'hashtags')}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-3 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
              >
                {hashtagsCopied ? 'コピーしました！' : 'まとめてコピー'}
              </button>
            </div>
            <p className="text-sm text-indigo-600 leading-relaxed">
              {hashtagsText}
            </p>
          </div>

        </div>

        {/* アクション */}
        <div className="mt-6 space-y-3">
          <button
            onClick={() => router.push('/generate')}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            もう一度生成する
          </button>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-white text-gray-600 py-3 rounded-xl text-sm font-medium border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            店舗プロフィールを変更
          </button>
        </div>

      </div>
    </main>
  );
}
