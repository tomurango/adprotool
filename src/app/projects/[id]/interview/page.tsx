'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface ChecklistItem {
  id: string;
  question: string;
  answer: string | null;
  isCompleted: boolean;
  order: number;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function InterviewPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialItemId = searchParams.get('itemId');
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [projectName, setProjectName] = useState('');
  const [currentItemId, setCurrentItemId] = useState<string | null>(initialItemId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [apiKeyConfigured, setApiKeyConfigured] = useState<boolean | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/projects/${id}`).then(r => r.json()),
      fetch(`/api/projects/${id}/checklist`).then(r => r.json()),
      fetch('/api/settings/status').then(r => r.json()),
    ]).then(([project, checklist, status]) => {
      setApiKeyConfigured(status.configured);
      setProjectName(project.name);
      setItems(checklist);

      // 最初のメッセージを設定
      const focusItem = initialItemId
        ? checklist.find((i: ChecklistItem) => i.id === initialItemId)
        : checklist.find((i: ChecklistItem) => !i.isCompleted);

      if (focusItem) {
        setCurrentItemId(focusItem.id);
        setMessages([
          {
            role: 'assistant',
            content: `こんにちは！「${project.name}」について一緒に発信の準備をしていきましょう。\n\nまずは「${focusItem.question}」について聞かせてください。`,
          },
        ]);
      } else {
        setMessages([
          {
            role: 'assistant',
            content: `こんにちは！「${project.name}」のチェックシートはすべて完了しています。引き続き何でも話しかけてください！`,
          },
        ]);
      }
    });
  }, [id, initialItemId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || streaming) return;

    const userText = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userText }]);
    setStreaming(true);

    let assistantContent = '';
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: id,
          conversationId,
          checklistItemId: currentItemId,
          userMessage: userText,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTPエラー ${res.status}` }));
        throw new Error(err.error ?? `HTTPエラー ${res.status}`);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('ストリームを取得できませんでした');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n').filter(l => l.startsWith('data: '));

        for (const line of lines) {
          const json = JSON.parse(line.slice(6));
          if (json.error) throw new Error(json.error);
          if (json.chunk) {
            assistantContent += json.chunk;
            setMessages(prev => {
              const next = [...prev];
              next[next.length - 1] = { role: 'assistant', content: assistantContent };
              return next;
            });
          }
          if (json.done) {
            setConversationId(json.conversationId);
            // 抽出AIが更新した項目をチェック済みにする
            if (json.updatedItemIds?.length > 0) {
              setItems(prev =>
                prev.map(item =>
                  json.updatedItemIds.includes(item.id)
                    ? { ...item, isCompleted: true }
                    : item
                )
              );
            }
            // 進捗管理: 次のフォーカス項目へ
            if (json.nextChecklistItemId) {
              setCurrentItemId(json.nextChecklistItemId);
            }
            // 全項目完了
            if (json.allCompleted) {
              setMessages(prev => [
                ...prev,
                {
                  role: 'assistant',
                  content: 'チェックシートの全項目が揃いました！「アウトプット」から投稿文を生成できます。',
                },
              ]);
            }
          }
        }
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      console.error('[interview] AI error:', raw);

      // ユーザー向けのメッセージに変換
      let userMessage = '申し訳ありません、返答の生成中にエラーが発生しました。もう一度試してみてください。';
      if (raw.includes('API key') || raw.includes('APIキーが設定されていません')) {
        userMessage = 'APIキーが正しく設定されていないようです。右上の「設定」からAPIキーを確認してください。';
      } else if (raw.includes('404') || raw.includes('not found')) {
        userMessage = 'AIモデルが見つかりませんでした。設定のモデル名を確認してください。';
      } else if (raw.includes('429') || raw.includes('quota') || raw.includes('rate')) {
        userMessage = 'APIの利用制限に達しました。しばらく待ってから再試行してください。';
      }

      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = { role: 'assistant', content: `⚠️ ${userMessage}` };
        return next;
      });
    } finally {
      setStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      sendMessage();
    }
  }

  const currentItem = items.find(i => i.id === currentItemId);
  const completed = items.filter(i => i.isCompleted).length;

  if (apiKeyConfigured === false) {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.push(`/projects/${id}`)} className="text-gray-400 hover:text-gray-600 text-sm">
            ← 戻る
          </button>
          <span className="font-semibold text-gray-900 text-sm">{projectName} - インタビュー</span>
        </header>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-sm w-full text-center">
            <div className="text-5xl mb-4">🔑</div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">APIキーが必要です</h2>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              インタビュー機能を使うにはAIのAPIキーが必要です。
              設定ページでGemini・Claude・OpenAIいずれかのAPIキーを登録してください。
            </p>
            <div className="flex flex-col gap-3">
              <Link
                href="/settings"
                className="bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                設定ページへ
              </Link>
              <button
                onClick={() => router.push(`/projects/${id}`)}
                className="text-gray-400 text-sm hover:text-gray-600"
              >
                プロジェクトに戻る
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.push(`/projects/${id}`)} className="text-gray-400 hover:text-gray-600 text-sm">
          ← 戻る
        </button>
        <span className="font-semibold text-gray-900 text-sm">{projectName} - インタビュー</span>
        <span className="ml-auto text-xs text-gray-400">{completed}/{items.length}</span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* サイドバー: チェックシート */}
        <aside className="w-60 bg-white border-r border-gray-200 overflow-y-auto hidden sm:block">
          <div className="p-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">チェックシート</h3>
            <div className="space-y-2">
              {items.map(item => (
                <button
                  key={item.id}
                  onClick={() => setCurrentItemId(item.id)}
                  className={`w-full text-left flex items-start gap-2 p-2 rounded-lg text-xs transition-colors ${
                    item.id === currentItemId
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="shrink-0 mt-0.5">{item.isCompleted ? '✅' : '⬜'}</span>
                  <span className="line-clamp-2">{item.question}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* チャットエリア */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {currentItem && (
            <div className="bg-indigo-50 border-b border-indigo-100 px-4 py-2">
              <p className="text-xs text-indigo-700 font-medium">
                現在のテーマ: {currentItem.question}
              </p>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-800'
                  }`}
                >
                  {msg.content || <span className="text-gray-300 animate-pulse">...</span>}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* 入力フォーム */}
          <div className="border-t border-gray-200 bg-white p-4">
            <div className="flex gap-3 items-end">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                placeholder="メッセージを入力... (Enter で送信)"
                rows={2}
                disabled={streaming}
                className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none disabled:opacity-50"
              />
              <button
                onClick={sendMessage}
                disabled={streaming || !input.trim()}
                className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                送信
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
