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

interface Output {
  id: string;
  type: string;
  platform: string | null;
  content: string;
  status: string;
  createdAt: string;
}

interface ProjectDetail {
  id: string;
  name: string;
  description: string | null;
  checklistItems: ChecklistItem[];
  recentOutputs: Output[];
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`「${project?.name}」を削除しますか？\nチェックシートとアウトプットもすべて削除されます。`)) return;
    setDeleting(true);
    await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    router.push('/');
  }

  useEffect(() => {
    fetch(`/api/projects/${id}`)
      .then(r => r.json())
      .then(data => {
        setProject(data);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">読み込み中...</div>;
  }

  if (!project) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">プロジェクトが見つかりません</div>;
  }

  const completed = project.checklistItems.filter(i => i.isCompleted).length;
  const total = project.checklistItems.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push('/')}
            className="text-gray-400 hover:text-gray-600 text-sm"
          >
            ← 一覧
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-red-400 hover:text-red-600 text-sm hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
          >
            {deleting ? '削除中...' : 'プロジェクトを削除'}
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4">
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          {project.description && (
            <p className="text-gray-500 mt-1 text-sm">{project.description}</p>
          )}

          {/* プログレスバー */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-500 mb-1">
              <span>発信準備チェック</span>
              <span>{completed}/{total} ({progress}%)</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="bg-indigo-500 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* アクションボタン */}
          <div className="flex gap-3 mt-5">
            <Link
              href={`/projects/${id}/interview`}
              className="flex-1 bg-indigo-600 text-white text-center py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              インタビューを始める
            </Link>
            <Link
              href={`/projects/${id}/checklist`}
              className="flex-1 border border-gray-300 text-gray-700 text-center py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              チェックシート
            </Link>
          </div>
        </div>

        {/* 最近のアウトプット */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">生成済みアウトプット</h2>
            <Link href={`/projects/${id}/outputs`} className="text-sm text-indigo-600 hover:underline">
              すべて見る
            </Link>
          </div>
          {project.recentOutputs.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">まだアウトプットがありません</p>
          ) : (
            <div className="space-y-3">
              {project.recentOutputs.map(o => (
                <div key={o.id} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      {o.type === 'sns_post' ? 'SNS投稿' : '動画スクリプト'}
                    </span>
                    {o.platform && (
                      <span className="text-xs text-gray-400">{o.platform}</span>
                    )}
                    <span className={`text-xs ml-auto ${o.status === 'posted' ? 'text-green-600' : 'text-gray-400'}`}>
                      {o.status === 'posted' ? '投稿済み' : o.status === 'scheduled' ? '予約済み' : '下書き'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2">{o.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SNS連携 */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">SNS連携</h2>
          <a
            href={`/api/sns/twitter/auth?projectId=${id}`}
            className="flex items-center gap-3 border border-gray-200 rounded-lg p-3 hover:border-indigo-400 transition-colors"
          >
            <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center text-white text-xs font-bold">X</div>
            <div>
              <p className="text-sm font-medium text-gray-900">Twitter / X</p>
              <p className="text-xs text-gray-400">連携してワンクリック投稿</p>
            </div>
          </a>
        </div>
      </div>
    </main>
  );
}
