'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';

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
  isError?: boolean;
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
  const [directive, setDirective] = useState<{ focus: string; approach: string } | null>(null);
  const [insights, setInsights] = useState<Record<string, { gathered: string | null; missing: string | null }>>({});
  const [streaming, setStreaming] = useState(false);
  const [apiKeyConfigured, setApiKeyConfigured] = useState<boolean | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [lastUserMessage, setLastUserMessage] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/projects/${id}`).then(r => r.json()),
      fetch(`/api/projects/${id}/checklist`).then(r => r.json()),
      fetch('/api/settings/status').then(r => r.json()),
      fetch(`/api/projects/${id}/conversations`).then(r => r.json()),
    ]).then(([project, checklist, status, history]) => {
      setApiKeyConfigured(status.configured);
      setProjectName(project.name);
      setItems(checklist);

      // 前回の会話履歴がある場合は復元
      if (history.messages?.length > 0) {
        setConversationId(history.conversationId);
        setMessages(history.messages.filter((m: ChatMessage) => m.role !== 'system'));

        // フォーカス項目: 未完了の中で最初のもの
        const focusItem = initialItemId
          ? checklist.find((i: ChecklistItem) => i.id === initialItemId)
          : checklist.find((i: ChecklistItem) => !i.isCompleted);
        if (focusItem) setCurrentItemId(focusItem.id);
        return;
      }

      // 初回: ウェルカムメッセージ
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

  async function sendMessage(isRetry = false) {
    const userText = isRetry ? lastUserMessage : input.trim();
    if (!userText || streaming) return;

    if (!isRetry) {
      setInput('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      setLastUserMessage(userText);
      setMessages(prev => [...prev, { role: 'user', content: userText }]);
    } else {
      // リトライ: エラーになった assistant のプレースホルダーを削除して再プレース
      setMessages(prev => {
        const next = [...prev];
        if (next[next.length - 1]?.isError) next.pop();
        return [...next, { role: 'assistant', content: '' }];
      });
    }
    setStreaming(true);

    if (!isRetry) {
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
    }

    let assistantContent = '';

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: id,
          conversationId,
          checklistItemId: currentItemId,
          userMessage: userText,
          isRetry,
          directive,
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

          // ディレクターAIの分析結果（会話AIストリーミング前に届く）
          if (json.director) {
            if (json.directive) setDirective(json.directive);
            if (json.insights?.length > 0) {
              setInsights(prev => {
                const next = { ...prev };
                for (const ins of json.insights) {
                  next[ins.id] = { gathered: ins.gathered, missing: ins.missing };
                }
                return next;
              });
            }
            if (json.updatedItemIds?.length > 0) {
              setItems(prev =>
                prev.map(item =>
                  json.updatedItemIds.includes(item.id)
                    ? { ...item, isCompleted: true }
                    : item
                )
              );
            }
          }

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
        next[next.length - 1] = { role: 'assistant', content: userMessage, isError: true };
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
    <main className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.push(`/projects/${id}`)} className="text-gray-400 hover:text-gray-600 text-sm">
          ← 戻る
        </button>
        <span className="font-semibold text-gray-900 text-sm">{projectName} - インタビュー</span>
        <span className="ml-auto text-xs text-gray-400">{completed}/{items.length}</span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* サイドバー */}
        <aside className="w-64 bg-white border-r border-gray-200 overflow-y-auto hidden sm:flex flex-col">
          {/* ディレクターの現在の分析 */}
          {directive && (
            <div className="border-b border-gray-100 p-4">
              <p className="text-xs font-semibold text-indigo-600 mb-1">今フォーカス中</p>
              <p className="text-xs text-gray-700 font-medium mb-2">{directive.focus}</p>
              <p className="text-xs text-gray-400 leading-relaxed">{directive.approach}</p>
            </div>
          )}

          {/* 項目ごとの状況 */}
          <div className="flex-1 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">読み取り状況</p>
            <div className="space-y-3">
              {items.map(item => {
                const ins = insights[item.id];
                return (
                  <div key={item.id} className="text-xs">
                    <div className="flex items-start gap-1.5 mb-1">
                      <span className="shrink-0 mt-0.5">{item.isCompleted ? '✅' : '⬜'}</span>
                      <p className={`leading-snug font-medium ${item.isCompleted ? 'text-gray-700' : 'text-gray-500'}`}>
                        {item.question}
                      </p>
                    </div>
                    {item.isCompleted && item.answer ? (
                      <div className="ml-5">
                        <p className="text-gray-500 bg-green-50 border border-green-100 rounded px-2 py-1 leading-relaxed">
                          {item.answer}
                        </p>
                      </div>
                    ) : ins ? (
                      <div className="ml-5 space-y-1">
                        {ins.gathered && (
                          <div className="bg-blue-50 border border-blue-100 rounded px-2 py-1">
                            <p className="text-blue-600 font-medium mb-0.5">読み取れた内容</p>
                            <p className="text-gray-600 leading-relaxed">{ins.gathered}</p>
                          </div>
                        )}
                        {ins.missing && (
                          <div className="bg-amber-50 border border-amber-100 rounded px-2 py-1">
                            <p className="text-amber-600 font-medium mb-0.5">不足している情報</p>
                            <p className="text-gray-600 leading-relaxed">{ins.missing}</p>
                          </div>
                        )}
                        {!ins.gathered && !ins.missing && (
                          <p className="text-gray-300 italic">まだ話題に触れていません</p>
                        )}
                      </div>
                    ) : (
                      <div className="ml-5">
                        <p className="text-gray-300 italic">まだ話題に触れていません</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* チャットエリア */}
        <div className="flex-1 flex flex-col overflow-hidden">

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white whitespace-pre-wrap'
                      : msg.isError
                      ? 'bg-red-50 border border-red-200 text-red-700 whitespace-pre-wrap'
                      : 'bg-white border border-gray-200 text-gray-800'
                  }`}
                >
                  {msg.role === 'assistant' && !msg.isError ? (
                    msg.content
                      ? <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                            li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                          }}
                        >{msg.content}</ReactMarkdown>
                      : <span className="text-gray-300 animate-pulse">...</span>
                  ) : (
                    msg.content || <span className="text-gray-300 animate-pulse">...</span>
                  )}
                  {msg.isError && (
                    <button
                      onClick={() => sendMessage(true)}
                      disabled={streaming}
                      className="mt-2 block text-xs font-medium text-red-600 hover:text-red-800 underline disabled:opacity-50"
                    >
                      もう一度試す
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* ステータスバー */}
          {streaming && (
            <div className="border-t border-gray-100 bg-gray-50 px-4 py-1.5 flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.3s]" />
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.15s]" />
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" />
              <span className="text-xs text-gray-400 ml-1">
                {messages[messages.length - 1]?.content
                  ? '返答を生成中...'
                  : '会話を分析中...'}
              </span>
            </div>
          )}

          {/* 入力フォーム */}
          <div className="border-t border-gray-200 bg-white p-4">
            <div className="flex gap-3 items-end">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => {
                  setInput(e.target.value);
                  const el = e.target;
                  el.style.height = 'auto';
                  el.style.height = `${el.scrollHeight}px`;
                }}
                onKeyDown={handleKeyDown}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                placeholder="メッセージを入力... (Enter で送信 / Shift+Enter で改行)"
                rows={1}
                disabled={streaming}
                className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none disabled:opacity-50 max-h-40 overflow-y-auto"
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
