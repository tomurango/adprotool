import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { projects, checklistItems, conversations, messages } from '@/lib/db/schema';
import { initDb } from '@/lib/db/init';
import { ai, buildInterviewMessages, parseInterviewResponse } from '@/lib/ai';
import type { AIMessage } from '@/lib/ai';
import { nanoid } from 'nanoid';
import { eq, and, asc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  initDb();
  const body = await request.json();
  const { projectId, conversationId, checklistItemId, userMessage } = body;

  if (!projectId || !userMessage) {
    return NextResponse.json({ error: 'projectId と userMessage は必須です' }, { status: 400 });
  }

  // プロジェクト情報取得
  const project = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project.length) {
    return NextResponse.json({ error: 'プロジェクトが見つかりません' }, { status: 404 });
  }

  // チェックシート取得
  const items = await db
    .select()
    .from(checklistItems)
    .where(eq(checklistItems.projectId, projectId))
    .orderBy(asc(checklistItems.order));

  const currentItem = checklistItemId
    ? items.find(i => i.id === checklistItemId) ?? null
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

  // ユーザーメッセージ保存
  const userMsgId = nanoid();
  await db.insert(messages).values({
    id: userMsgId,
    conversationId: convId,
    role: 'user',
    content: userMessage,
    createdAt: new Date(),
  });

  // AI呼び出し用メッセージ構築
  const conversationHistory: AIMessage[] = [
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage },
  ];

  const { messages: aiMessages, options } = buildInterviewMessages(
    project[0],
    items,
    currentItem ?? null,
    conversationHistory
  );

  // AIレスポンス生成（ストリーミング）
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let fullResponse = '';
      try {
        for await (const chunk of ai.stream(aiMessages, options)) {
          fullResponse += chunk;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
        }

        const { content, checkComplete } = parseInterviewResponse(fullResponse);

        // AIメッセージ保存
        const aiMsgId = nanoid();
        await db.insert(messages).values({
          id: aiMsgId,
          conversationId: convId,
          role: 'assistant',
          content,
          createdAt: new Date(),
        });

        // チェック完了処理
        if (checkComplete && checklistItemId) {
          await db
            .update(checklistItems)
            .set({ isCompleted: true, updatedAt: new Date() })
            .where(eq(checklistItems.id, checklistItemId));
        }

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              done: true,
              conversationId: convId,
              checkComplete,
              messageId: aiMsgId,
            })}\n\n`
          )
        );
      } catch (err) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: String(err) })}\n\n`)
        );
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
