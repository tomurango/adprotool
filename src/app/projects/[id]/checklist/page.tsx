'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface ChecklistItem {
  id: string;
  question: string;
  answer: string | null;
  isCompleted: boolean;
  order: number;
}

export default function ChecklistPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/projects/${id}`).then(r => r.json()),
      fetch(`/api/projects/${id}/checklist`).then(r => r.json()),
    ]).then(([project, checklist]) => {
      setProjectName(project.name);
      setItems(checklist);
      setLoading(false);
    });
  }, [id]);

  const completed = items.filter(i => i.isCompleted).length;
  const total = items.length;

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">読み込み中...</div>;
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push(`/projects/${id}`)} className="text-gray-400 hover:text-gray-600">
            ← 戻る
          </button>
        </div>

        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">{projectName}の発信準備チェック</h1>
          <p className="text-sm text-gray-500 mt-1">達成度: {completed}/{total}</p>
          <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
            <div
              className="bg-indigo-500 h-2 rounded-full transition-all"
              style={{ width: `${total > 0 ? Math.round((completed / total) * 100) : 0}%` }}
            />
          </div>
        </div>

        <div className="space-y-3 mb-6">
          {items.map(item => (
            <div key={item.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center gap-3 p-4">
                <span className="text-xl shrink-0">{item.isCompleted ? '✅' : '⬜'}</span>
                <p className="text-sm font-medium text-gray-800 flex-1">{item.question}</p>
                {item.isCompleted ? (
                  <button
                    onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                    className="text-xs text-indigo-600 shrink-0 hover:underline"
                  >
                    {expandedItem === item.id ? '閉じる' : '回答を見る'}
                  </button>
                ) : (
                  <Link
                    href={`/projects/${id}/interview?itemId=${item.id}`}
                    className="text-xs text-indigo-600 shrink-0 hover:underline whitespace-nowrap"
                  >
                    話してみる →
                  </Link>
                )}
              </div>
              {expandedItem === item.id && item.answer && (
                <div className="border-t border-gray-100 px-4 pb-4 pt-3">
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <Link
          href={`/projects/${id}/outputs`}
          className={`block w-full text-center py-3 rounded-xl font-medium text-sm transition-colors ${
            completed > 0
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed pointer-events-none'
          }`}
        >
          {completed === total ? '全項目完了！投稿文を生成する' : `投稿文を生成する (${completed}/${total}項目完了)`}
        </Link>
      </div>
    </main>
  );
}
