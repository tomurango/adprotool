'use client';

import { useEffect, useRef, useState } from 'react';
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
  const [apiKeyConfigured, setApiKeyConfigured] = useState<boolean | null>(null);

  // ⋮ メニュー
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 編集
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // 削除
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/projects/${id}`).then(r => r.json()),
      fetch('/api/settings/status').then(r => r.json()),
    ]).then(([projectData, statusData]) => {
      setProject(projectData);
      setApiKeyConfigured(statusData.configured);
      setLoading(false);
    });
  }, [id]);

  // メニュー外クリックで閉じる
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function openEdit() {
    setEditName(project?.name ?? '');
    setEditDescription(project?.description ?? '');
    setEditing(true);
    setMenuOpen(false);
  }

  async function handleSave() {
    if (!editName.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName, description: editDescription }),
    });
    const updated = await res.json();
    setProject(prev => prev ? { ...prev, name: updated.name, description: updated.description } : prev);
    setSaving(false);
    setEditing(false);
  }

  async function handleDelete() {
    setMenuOpen(false);
    if (!confirm(`「${project?.name}」を削除しますか？\nチェックシートとアウトプットもすべて削除されます。`)) return;
    setDeleting(true);
    await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    router.push('/');
  }

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

          {/* ⋮ メニュー */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(o => !o)}
              disabled={deleting}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40"
              aria-label="メニュー"
            >
              <span className="text-lg leading-none">⋮</span>
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-10 w-36 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-10">
                <button
                  onClick={openEdit}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  編集
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  削除
                </button>
              </div>
            )}
          </div>
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

          {/* APIキー未設定の警告 */}
          {apiKeyConfigured === false && (
            <div className="mt-4 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
              <span className="text-amber-500 mt-0.5 shrink-0">⚠️</span>
              <p className="text-xs text-amber-700">
                インタビューを始めるにはAPIキーが必要です。
                <Link href="/settings" className="underline font-medium ml-1">設定ページ</Link>
                で登録してください。
              </p>
            </div>
          )}

          {/* アクションボタン */}
          <div className="flex gap-3 mt-4">
            {apiKeyConfigured === false ? (
              <Link
                href="/settings"
                className="flex-1 bg-amber-500 text-white text-center py-2.5 rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
              >
                APIキーを設定する
              </Link>
            ) : (
              <Link
                href={`/projects/${id}/interview`}
                className="flex-1 bg-indigo-600 text-white text-center py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                インタビューを始める
              </Link>
            )}
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

      {/* 編集モーダル */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 mb-4">プロジェクトを編集</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  プロジェクト名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
                <textarea
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setEditing(false)}
                className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editName.trim()}
                className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
