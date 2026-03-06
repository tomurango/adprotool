import { db } from '@/lib/db';
import { projects, checklistItems, conversations, messages } from '@/lib/db/schema';
import { initDb } from '@/lib/db/init';
import {
  ai,
  buildInterviewMessages,
  buildDirectorMessages,
  parseDirectorResult,
} from '@/lib/ai';
import type { AIMessage } from '@/lib/ai';
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

  // 会話履歴（現在のユーザーメッセージを含む）
  const conversationHistory: AIMessage[] = [
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage },
  ];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

      try {
        // ── Step 1: ディレクターAI（先行実行）──
        // 現在の会話を分析して回答を抽出し、会話AIへの指示を生成する。
        const updatedItemIds: string[] = [];
        let nextDirective: Directive | null = null;
        let insights: { id: string; gathered: string | null; missing: string | null }[] = [];

        try {
          const { messages: directorMsgs, options: directorOpts } =
            buildDirectorMessages(items, conversationHistory);

          const directorRaw = await ai.chat(directorMsgs, directorOpts);
          const directorResult = parseDirectorResult(directorRaw);

          if (directorResult) {
            // 十分な回答が得られた項目のみDB更新
            for (const result of directorResult.extracted) {
              if (!result.answered) continue;
              const item = items.find(i => i.id === result.id);
              if (!item || !!item.isCompleted) continue;
              await db
                .update(checklistItems)
                .set({
                  isCompleted: true,
                  answer: result.gathered,
                  updatedAt: new Date(),
                })
                .where(eq(checklistItems.id, result.id));
              updatedItemIds.push(result.id);
            }

            nextDirective = directorResult.directive ?? null;
            insights = directorResult.extracted.map(e => ({
              id: e.id,
              gathered: e.gathered,
              missing: e.missing,
            }));
          }
        } catch (directorErr) {
          console.warn('[director] skipped:', String(directorErr));
        }

        // ディレクターの分析結果をクライアントへ先送り（サイドバー更新）
        send({
          director: true,
          updatedItemIds,
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
