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

interface HistoryEntry {
  id: string;
  answer: string | null;
  source: 'ai' | 'manual';
  reasoning: string | null;
  createdAt: number;
}

export default function ChecklistPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [saving, setSaving] = useState(false);
  const [historyItemId, setHistoryItemId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

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

  function startEdit(item: ChecklistItem) {
    setEditingId(item.id);
    setEditText(item.answer ?? '');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText('');
  }

  async function saveEdit(item: ChecklistItem) {
    setSaving(true);
    const res = await fetch(`/api/projects/${id}/checklist/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answer: editText.trim(),
        isCompleted: editText.trim().length > 0,
      }),
    });
    const updated = await res.json();
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, ...updated } : i));
    setEditingId(null);
    setEditText('');
    setSaving(false);
  }

  async function openHistory(item: ChecklistItem) {
    setHistoryItemId(item.id);
    const res = await fetch(`/api/projects/${id}/checklist/${item.id}`);
    const data = await res.json();
    setHistory(data);
  }

  async function revert(item: ChecklistItem) {
    const res = await fetch(`/api/projects/${id}/checklist/${item.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'revert' }),
    });
    const updated = await res.json();
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, ...updated } : i));
    // 履歴を再取得
    const histRes = await fetch(`/api/projects/${id}/checklist/${item.id}`);
    setHistory(await histRes.json());
  }

  async function toggleComplete(item: ChecklistItem) {
    const willComplete = !item.isCompleted;
    const res = await fetch(`/api/projects/${id}/checklist/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        isCompleted: willComplete,
        // 未完了に戻す場合は回答を消さない
      }),
    });
    const updated = await res.json();
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, ...updated } : i));
  }

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
              {/* ヘッダー行 */}
              <div className="flex items-start gap-3 p-4">
                <button
                  onClick={() => toggleComplete(item)}
                  className="text-xl shrink-0 mt-0.5 hover:opacity-70 transition-opacity"
                  title={item.isCompleted ? '未完了に戻す' : '完了にする'}
                >
                  {item.isCompleted ? '✅' : '⬜'}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{item.question}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {editingId !== item.id && (
                    <button
                      onClick={() => startEdit(item)}
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      {item.answer ? '編集' : '記入する'}
                    </button>
                  )}
                  {!item.isCompleted && editingId !== item.id && (
                    <Link
                      href={`/projects/${id}/interview?itemId=${item.id}`}
                      className="text-xs text-gray-400 hover:text-indigo-600 hover:underline whitespace-nowrap"
                    >
                      AIに話す →
                    </Link>
                  )}
                </div>
              </div>

              {/* 回答表示 / 編集エリア */}
              {editingId === item.id ? (
                <div className="border-t border-gray-100 px-4 pb-4 pt-3">
                  <textarea
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    placeholder="回答を入力してください..."
                    rows={4}
                    autoFocus
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => saveEdit(item)}
                      disabled={saving}
                      className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {saving ? '保存中...' : '保存'}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="text-gray-400 px-4 py-1.5 rounded-lg text-xs hover:text-gray-600"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              ) : item.answer ? (
                <div className="border-t border-gray-100 px-4 pb-4 pt-3">
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{item.answer}</p>
                  <button
                    onClick={() => historyItemId === item.id ? setHistoryItemId(null) : openHistory(item)}
                    className="mt-2 text-xs text-gray-400 hover:text-gray-600 underline"
                  >
                    {historyItemId === item.id ? '履歴を閉じる' : '変更履歴'}
                  </button>
                  {/* 履歴パネル */}
                  {historyItemId === item.id && (
                    <div className="mt-3 space-y-2">
                      {history.length === 0 ? (
                        <p className="text-xs text-gray-400">変更履歴はありません</p>
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-medium text-gray-500">変更履歴</p>
                            <button
                              onClick={() => revert(item)}
                              className="text-xs text-amber-600 hover:underline"
                            >
                              ひとつ前に戻す
                            </button>
                          </div>
                          {history.map(h => (
                            <div key={h.id} className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-xs">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${h.source === 'ai' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-600'}`}>
                                  {h.source === 'ai' ? 'AI' : '手動'}
                                </span>
                                <span className="text-gray-400">
                                  {new Date(h.createdAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-gray-600 whitespace-pre-wrap">{h.answer ?? '（空）'}</p>
                              {h.reasoning && h.reasoning !== 'revert' && (
                                <p className="text-gray-400 mt-1 italic">根拠: {h.reasoning}</p>
                              )}
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              ) : null}
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
