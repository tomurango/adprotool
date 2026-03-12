import { db } from '@/lib/db';
import { projects, checklistItems, conversations, messages, checklistItemHistory } from '@/lib/db/schema';
import { initDb } from '@/lib/db/init';
import {
  ai,
  buildInterviewMessages,
  buildEvaluatorMessages,
  parseEvaluatorResult,
  buildPlannerMessages,
  parsePlannerResult,
} from '@/lib/ai';
import type { AIMessage, EvaluatorResult } from '@/lib/ai';
import type { Directive } from '@/lib/ai/prompts/interview';
import { nanoid } from 'nanoid';
import { eq, asc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  initDb();
  const body = await request.json();
  const { projectId, conversationId, checklistItemId, userMessage, isRetry } = body;

  if (!projectId || !userMessage) {
    return Response.json({ error: 'projectId と userMessage は必須です' }, { status: 400 });
  }

  // プロジェクト・チェックシート取得
  const project = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project.length) {
    return Response.json({ error: 'プロジェクトが見つかりません' }, { status: 404 });
  }

  const items = await db
    .select()
    .from(checklistItems)
    .where(eq(checklistItems.projectId, projectId))
    .orderBy(asc(checklistItems.order));

  const currentItem = checklistItemId
    ? (items.find(i => i.id === checklistItemId) ?? null)
    : null;

  // 会話取得または作成
  let convId = conversationId;
  if (!convId) {
    convId = nanoid();
    await db.insert(conversations).values({
      id: convId,
      projectId,
      checklistItemId: checklistItemId ?? null,
      createdAt: new Date(),
    });
  }

  // 会話履歴取得
  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, convId))
    .orderBy(asc(messages.createdAt));

  // ユーザーメッセージをDBに保存
  const lastMsg = history[history.length - 1];
  const isDuplicate = isRetry && lastMsg?.role === 'user';
  if (!isDuplicate) {
    await db.insert(messages).values({
      id: nanoid(),
      conversationId: convId,
      role: 'user',
      content: userMessage,
      createdAt: new Date(),
    });
  }

  // チェックシートブロックを除去（過去の会話に混入した場合の対策）
  function sanitizeContent(content: string): string {
    return content
      .replace(/【チェックシートの状況】[\s\S]*?(?=\n\n|\n(?=[^\n])|$)/g, '')
      .trim();
  }

  // 会話履歴（現在のユーザーメッセージを含む）
  const conversationHistory: AIMessage[] = [
    ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: sanitizeContent(m.content) })),
    { role: 'user', content: userMessage },
  ];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

      try {
        // ── Step 1: 評価AI + 計画AI（先行実行）──
        const updatedItems: { id: string; answer: string | null }[] = [];
        let nextDirective: Directive | null = null;
        let insights: { id: string; score: number; summary: string | null; missing: string | null }[] = [];

        try {
          // Step 1a: 評価AI（スコアリング）
          const { messages: evalMsgs, options: evalOpts } =
            buildEvaluatorMessages(items, conversationHistory);
          const evalRaw = await ai.chat(evalMsgs, evalOpts);
          console.log('[evaluator] raw:', evalRaw.slice(0, 300));
          const evalResult: EvaluatorResult | null = parseEvaluatorResult(evalRaw);
          console.log('[evaluator] parsed:', evalResult ? 'ok' : 'null');

          if (evalResult) {
            for (const e of evalResult.items) {
              const item = items.find(i => i.id === e.id);
              if (!item) continue;

              if (!item.isCompleted && e.score === 3) {
                // 未完了 → 新規完了
                await db
                  .update(checklistItems)
                  .set({ isCompleted: true, answer: e.summary, updatedAt: new Date() })
                  .where(eq(checklistItems.id, e.id));
                await db.insert(checklistItemHistory).values({
                  id: nanoid(),
                  checklistItemId: e.id,
                  answer: e.summary,
                  source: 'ai',
                  reasoning: '会話から十分な情報が得られた',
                  createdAt: new Date(),
                });
                updatedItems.push({ id: e.id, answer: e.summary });
              } else if (!!item.isCompleted && e.shouldUpdate && e.summary) {
                // 完了済み → 新情報で上書き（旧answerを履歴に保存）
                await db.insert(checklistItemHistory).values({
                  id: nanoid(),
                  checklistItemId: e.id,
                  answer: item.answer,
                  source: 'ai',
                  reasoning: e.reasoning ?? null,
                  createdAt: new Date(),
                });
                await db
                  .update(checklistItems)
                  .set({ answer: e.summary, updatedAt: new Date() })
                  .where(eq(checklistItems.id, e.id));
                updatedItems.push({ id: e.id, answer: e.summary });
              }
            }

            // インサイト（全未完了項目のスコア・サマリー）
            insights = evalResult.items.map(e => ({
              id: e.id,
              score: e.score,
              summary: e.summary,
              missing: e.missing ?? null,
            }));

            // Step 1b: 計画AI（ディレクティブ生成）
            const recentMessages = conversationHistory.slice(-6);
            const { messages: planMsgs, options: planOpts } =
              buildPlannerMessages(items, evalResult, recentMessages);
            const planRaw = await ai.chat(planMsgs, planOpts);
            console.log('[planner] raw:', planRaw.slice(0, 300));
            const planResult = parsePlannerResult(planRaw);
            console.log('[planner] parsed:', planResult ? 'ok' : 'null');

            if (planResult?.directive) {
              const focusItem = items.find(i => i.id === planResult.directive!.focusItemId);
              nextDirective = {
                ...planResult.directive,
                focusQuestion: focusItem?.question ?? undefined,
              };
            } else {
              // parse 失敗時: スコアが最も低い未完了項目をフォールバックとして使用
              const lowestScored = evalResult.items
                .filter(e => e.score < 3)
                .sort((a, b) => a.score - b.score)[0];
              const fallbackItem = lowestScored
                ? items.find(i => i.id === lowestScored.id && !i.isCompleted)
                : null;
              nextDirective = fallbackItem
                ? { focusItemId: fallbackItem.id, focusQuestion: fallbackItem.question, approach: '自然な会話の流れで深掘りしてください', confirmations: [] }
                : null;
            }
          }
        } catch (directorErr) {
          console.warn('[evaluator/planner] skipped:', String(directorErr));
        }

        // 評価・計画結果をクライアントへ先送り（サイドバー更新）
        send({
          director: true,
          updatedItems,
          directive: nextDirective,
          insights,
        });

        // ── Step 2: 会話AI（ディレクターの指示を受けてストリーミング）──
        const { messages: aiMessages, options } = buildInterviewMessages(
          project[0],
          items,
          currentItem,
          conversationHistory,
          nextDirective
        );

        let fullResponse = '';
        for await (const chunk of ai.stream(aiMessages, options)) {
          fullResponse += chunk;
          send({ chunk });
        }

        // 会話AIの返答をDBに保存
        await db.insert(messages).values({
          id: nanoid(),
          conversationId: convId,
          role: 'assistant',
          content: fullResponse,
          createdAt: new Date(),
        });

        // ── Step 3: 進捗管理（コード）──
        const allItems = await db
          .select()
          .from(checklistItems)
          .where(eq(checklistItems.projectId, projectId))
          .orderBy(asc(checklistItems.order));

        const nextItem = allItems.find(i => !i.isCompleted) ?? null;
        const allCompleted = allItems.every(i => i.isCompleted);

        send({
          done: true,
          conversationId: convId,
          nextChecklistItemId: nextItem?.id ?? null,
          allCompleted,
        });
      } catch (err) {
        send({ error: String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
