'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { OUTPUT_FORMAT_LIST, type OutputFormat } from '@/lib/output-formats';

interface Output {
  id: string;
  type: 'sns_post' | 'video_script';
  platform: string | null;
  format: string | null;
  content: string;
  status: 'draft' | 'posted' | 'scheduled';
  createdAt: string;
}

export default function OutputsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [outputs, setOutputs] = useState<Output[]>([]);
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [posting, setPosting] = useState<string | null>(null);

  // 生成フォーム
  const [genType, setGenType] = useState<'sns_post' | 'video_script'>('sns_post');
  const [genPlatform, setGenPlatform] = useState<'twitter' | 'instagram'>('twitter');
  const [genFormat, setGenFormat] = useState<OutputFormat>('plain_script');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function copyContent(outputId: string, content: string) {
    await navigator.clipboard.writeText(content);
    setCopiedId(outputId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    const [project, outs] = await Promise.all([
      fetch(`/api/projects/${id}`).then(r => r.json()),
      fetch(`/api/projects/${id}/outputs`).then(r => r.json()),
    ]);
    setProjectName(project.name);
    setOutputs(outs);
    setLoading(false);
  }

  async function generate() {
    setGenerating(true);
    const body: Record<string, string> = { projectId: id, type: genType };
    if (genType === 'sns_post') body.platform = genPlatform;
    if (genType === 'video_script') body.format = genFormat;

    const res = await fetch('/api/outputs/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      await loadData();
    }
    setGenerating(false);
  }

  async function saveEdit(outputId: string) {
    await fetch(`/api/outputs/${outputId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: editContent }),
    });
    setEditingId(null);
    await loadData();
  }

  async function postToSNS(outputId: string) {
    setPosting(outputId);
    const res = await fetch(`/api/outputs/${outputId}/post`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      alert(`投稿しました！\n${data.url ?? ''}`);
      await loadData();
    } else {
      alert(`投稿に失敗しました: ${data.error}`);
    }
    setPosting(null);
  }

  async function deleteOutput(outputId: string) {
    if (!confirm('削除しますか？')) return;
    await fetch(`/api/outputs/${outputId}`, { method: 'DELETE' });
    await loadData();
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">読み込み中...</div>;
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push(`/projects/${id}`)} className="text-gray-400 hover:text-gray-600 text-sm">
            ← 戻る
          </button>
          <span className="font-semibold text-gray-900">{projectName} - アウトプット</span>
        </div>

        {/* 生成パネル */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">新規生成</h2>
          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                onClick={() => setGenType('sns_post')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  genType === 'sns_post' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-600 hover:border-indigo-400'
                }`}
              >
                SNS投稿文
              </button>
              <button
                onClick={() => setGenType('video_script')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  genType === 'video_script' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-600 hover:border-indigo-400'
                }`}
              >
                動画スクリプト
              </button>
            </div>

            {genType === 'sns_post' && (
              <div className="flex gap-2">
                {(['twitter', 'instagram'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setGenPlatform(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      genPlatform === p ? 'bg-indigo-50 text-indigo-700 border-indigo-400' : 'border-gray-200 text-gray-500 hover:border-indigo-300'
                    }`}
                  >
                    {p === 'twitter' ? 'Twitter / X' : 'Instagram'}
                  </button>
                ))}
              </div>
            )}

            {genType === 'video_script' && (
              <div className="flex gap-2 flex-wrap">
                {OUTPUT_FORMAT_LIST.map(f => (
                  <button
                    key={f.format}
                    onClick={() => setGenFormat(f.format)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      genFormat === f.format ? 'bg-indigo-50 text-indigo-700 border-indigo-400' : 'border-gray-200 text-gray-500 hover:border-indigo-300'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={generate}
              disabled={generating}
              className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {generating ? '生成中...' : '生成する'}
            </button>
          </div>
        </div>

        {/* アウトプット一覧 */}
        {outputs.length === 0 ? (
          <p className="text-center text-gray-400 py-10">まだアウトプットがありません</p>
        ) : (
          <div className="space-y-4">
            {outputs.map(o => (
              <div key={o.id} className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    {o.type === 'sns_post' ? 'SNS投稿' : '動画スクリプト'}
                  </span>
                  {o.platform && <span className="text-xs text-gray-400">{o.platform}</span>}
                  {o.format && (
                    o.format === 'runway_script' || o.format === 'runway_script_short' ? (
                      <a href="https://runwayml.com" target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-500 hover:underline">
                        {o.format === 'runway_script_short' ? 'Runway用（無料版）↗' : 'Runway用スクリプト ↗'}
                      </a>
                    ) : o.format === 'mootion_script' ? (
                      <a href="https://storyteller.mootion.com/" target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-500 hover:underline">
                        Mootion Storyteller ↗
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400">
                        {OUTPUT_FORMAT_LIST.find(f => f.format === o.format)?.label ?? o.format}
                      </span>
                    )
                  )}
                  <span className={`text-xs ml-auto ${o.status === 'posted' ? 'text-green-600' : 'text-gray-400'}`}>
                    {o.status === 'posted' ? '投稿済み' : '下書き'}
                  </span>
                </div>

                {editingId === o.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                      rows={8}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(o.id)}
                        className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
                      >
                        保存
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={`text-sm text-gray-700 whitespace-pre-wrap mb-4 ${expandedId !== o.id && o.content.length > 600 ? 'max-h-48 overflow-hidden relative' : ''}`}>
                      <p>{o.content}</p>
                      {expandedId !== o.id && o.content.length > 600 && (
                        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent" />
                      )}
                    </div>
                    {o.content.length > 600 && (
                      <button
                        onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}
                        className="text-xs text-indigo-600 hover:underline mb-3 block"
                      >
                        {expandedId === o.id ? '折りたたむ' : 'すべて表示'}
                      </button>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => copyContent(o.id, o.content)}
                        className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                      >
                        {copiedId === o.id ? 'コピーしました' : 'コピー'}
                      </button>
                      <button
                        onClick={() => { setEditingId(o.id); setEditContent(o.content); }}
                        className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                      >
                        編集
                      </button>
                      {o.type === 'sns_post' && o.status !== 'posted' && (
                        <button
                          onClick={() => postToSNS(o.id)}
                          disabled={posting === o.id}
                          className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {posting === o.id ? '投稿中...' : '投稿する'}
                        </button>
                      )}
                      <button
                        onClick={() => deleteOutput(o.id)}
                        className="px-3 py-1.5 text-xs border border-red-200 text-red-500 rounded-lg hover:bg-red-50 ml-auto"
                      >
                        削除
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
