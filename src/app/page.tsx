'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const BUSINESS_TYPES = ['美容院・美容室', 'カフェ', '飲食店・レストラン', 'ネイルサロン', '整体・マッサージ', 'アパレル・セレクトショップ', 'その他'];
const ATMOSPHERES = ['カジュアル', '高級・ラグジュアリー', 'ナチュラル・オーガニック', 'モダン・スタイリッシュ', 'ポップ・かわいい', '和風'];

export default function Home() {
  const router = useRouter();
  const [form, setForm] = useState({
    businessType: '',
    atmosphere: '',
    targetCustomer: '',
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    localStorage.setItem('storeProfile', JSON.stringify(form));
    router.push('/generate');
  }

  const isValid = form.businessType && form.atmosphere && form.targetCustomer.trim();

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-10">

        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">アドプロ</h1>
            <p className="text-sm text-gray-500 mt-0.5">Instagram投稿アシスタント</p>
          </div>
          <Link
            href="/settings"
            className="text-sm text-gray-400 hover:text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            設定
          </Link>
        </div>

        {/* フォーム */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">店舗プロフィール</h2>
          <p className="text-xs text-gray-400 mb-6">AIがキャプションを生成するために使います。</p>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* 業種 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">業種</label>
              <div className="flex flex-wrap gap-2">
                {BUSINESS_TYPES.map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, businessType: type }))}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      form.businessType === type
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* 雰囲気 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">雰囲気</label>
              <div className="flex flex-wrap gap-2">
                {ATMOSPHERES.map(atm => (
                  <button
                    key={atm}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, atmosphere: atm }))}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      form.atmosphere === atm
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
                    }`}
                  >
                    {atm}
                  </button>
                ))}
              </div>
            </div>

            {/* ターゲット客層 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ターゲット客層
              </label>
              <input
                type="text"
                value={form.targetCustomer}
                onChange={e => setForm(prev => ({ ...prev, targetCustomer: e.target.value }))}
                placeholder="例：20代〜30代の女性"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={!isValid}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              次へ →
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
