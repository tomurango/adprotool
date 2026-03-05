import { db } from '@/lib/db';
import { projects, checklistItems, conversations, messages } from '@/lib/db/schema';
import { initDb } from '@/lib/db/init';
import {
  ai,
  buildInterviewMessages,
  buildExtractionMessages,
  parseExtractionResult,
} from '@/lib/ai';
import type { AIMessage } from '@/lib/ai';
import { nanoid } from 'nanoid';
import { eq, asc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  initDb();
  const body = await request.json();
  const { projectId, conversationId, checklistItemId, userMessage } = body;

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
  await db.insert(messages).values({
    id: nanoid(),
    conversationId: convId,
    role: 'user',
    content: userMessage,
    createdAt: new Date(),
  });

  // 会話AIに渡す履歴を構築
  const conversationHistory: AIMessage[] = [
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage },
  ];

  const { messages: aiMessages, options } = buildInterviewMessages(
    project[0],
    items,
    currentItem,
    conversationHistory
  );

  // SSEストリーミング
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

      let fullResponse = '';
      try {
        // ── Step 1: 会話AI（ストリーミング）──
        for await (const chunk of ai.stream(aiMessages, options)) {
          fullResponse += chunk;
          send({ chunk });
        }

        // 会話AIの返答をDBに保存
        const aiMsgId = nanoid();
        await db.insert(messages).values({
          id: aiMsgId,
          conversationId: convId,
          role: 'assistant',
          content: fullResponse,
          createdAt: new Date(),
        });

        // ── Step 2: 抽出AI（非ストリーミング）──
        // 未完了の項目がある場合のみ実行。
        // レート制限等で失敗しても会話は止めない（次回のメッセージ時に再試行される）。
        const unansweredItems = items.filter(i => !i.isCompleted);
        const updatedItemIds: string[] = [];

        if (unansweredItems.length > 0) {
          try {
            const fullHistory: AIMessage[] = [
              ...conversationHistory,
              { role: 'assistant', content: fullResponse },
            ];
            const { messages: extractMsgs, options: extractOpts } =
              buildExtractionMessages(unansweredItems, fullHistory);

            const extractionRaw = await ai.chat(extractMsgs, extractOpts);
            const extraction = parseExtractionResult(extractionRaw);

            if (extraction) {
              for (const result of extraction.items) {
                if (!result.answered) continue;
                await db
                  .update(checklistItems)
                  .set({
                    isCompleted: true,
                    answer: result.summary,
                    updatedAt: new Date(),
                  })
                  .where(eq(checklistItems.id, result.id));
                updatedItemIds.push(result.id);
              }
            }
          } catch (extractErr) {
            // 抽出失敗はサーバーログのみ。会話の応答には影響しない。
            console.warn('[extraction] skipped:', String(extractErr));
          }
        }

        // ── Step 3: 進捗管理（コード）──
        // 次にフォーカスする項目を選ぶ（未完了の中で最も order が小さいもの）
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
          updatedItemIds,
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
